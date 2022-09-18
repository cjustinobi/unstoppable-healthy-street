import Web3 from 'web3'
import BigNumber from 'bignumber.js'
import marketplaceAbi from '../contract/marketplace.abi.json'
import UAuth from '@uauth/js'
import { domainResolution } from './resolveDomain'
import { sendTx } from './transaction'

const ERC20_DECIMALS = 18
const MPContractAddress = "0x99196B5E0e64bB22C317F793E3DEc417D5458831"

let web3 = ''
let contract = ''
let products = []

const uauth = new UAuth({
  clientID: "8281b30a-61de-4df4-99e4-116a3a4c340a",
  redirectUri: "https://cjustinobi.github.io/unstoppable-healthy-street/",
  // redirectUri: "http://localhost:3000",
  scope: "openid wallet"
})


const getContract = async () => {
  try {
    const { ethereum } = window

    if (ethereum) {
      //checking for eth object in the window
      // Set the ABI
      web3 = new Web3(process.env.GOERLI_URL)
      contract = new web3.eth.Contract(marketplaceAbi, MPContractAddress, {
        from: localStorage.getItem('wallet_address'), // default from address
        gasPrice: '2000000' // default gas price in wei, 20 gwei in this case
      });

    } else {
      console.log('Ethereum object doesn\'t exist!')
    }
  } catch (error) {
    console.log('ERROR:', error)
  }
}

const getBalance = async function () {

  const web3 = new Web3(window.ethereum)

  await web3.eth.getBalance(localStorage.getItem('wallet_address'), (err, balance) => {
    document.querySelector("#balance").textContent = parseFloat(web3.utils.fromWei(balance, 'ether')).toFixed(2)
  });

}

const getProducts = async function() {

  const _productsLength = await contract.methods.getProductsLength().call()
  const _products = []
  notification("⌛ Loading...")
  for (let i = 0; i < _productsLength; i++) {
    let _product = new Promise(async (resolve, reject) => {
      let p = await contract.methods.readProduct(i).call()
      resolve({
        index: i,
        owner: p[0],
        name: p[1],
        image: p[2],
        description: p[3],
        domain: p[4],
        price: new BigNumber(p[5]),
        sold: p[6],
      })
    })
    _products.push(_product)
  }
  products = await Promise.all(_products)
  renderProducts()
  notificationOff()
}

function renderProducts() {
  document.getElementById("marketplace").innerHTML = ""
  products.forEach((_product) => {
    const newDiv = document.createElement("div")
    newDiv.className = "col-md-4"
    newDiv.innerHTML = productTemplate(_product)
    document.getElementById("marketplace").appendChild(newDiv)
  })
}

function productTemplate(_product) {
  return `
    <div class="card mb-4">
      <img class="card-img-top" src="${_product.image}" alt="...">
      <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
        ${_product.sold} Sold
      </div>
      <div class="card-body text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_product.owner)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_product.name}</h2>
        <p class="card-text mb-4" style="min-height: 82px">
          ${_product.description}             
        </p>
        <p class="card-text mt-4 tip" id="tip">
          <i class="bi bi-cup-straw"></i>
          <span class="tip-address">${_product.domain}</span>
        </p>
        <div class="d-grid gap-2">
          <a class="btn btn-lg btn-outline-dark buyBtn fs-6 p-3" id=${_product.index}-${_product.price}>
            Buy for ${web3.utils.fromWei(String(_product.price), 'ether')}
            
          </a>
        </div>
      </div>
    </div>
  `
}

function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL()

  return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `
}

function notification(_text) {
  document.querySelector(".alert").style.display = "block"
  document.querySelector("#notification").innerHTML = _text
}

function notificationOff() {
  document.querySelector(".alert").style.display = "none"
}


document
  .querySelector('#sendTipBtn')
  .addEventListener('click', async () => {
    const amount = document.getElementById("tipAmount").value
    const receiverAddress = document.getElementById("resolvedAddress").value
    const txHash = await sendTx(receiverAddress, amount)
    if (txHash) {
      document.querySelector('#tip-form').reset()
      notification(`🎉 Check on Etherscan: ${txHash}`)
    }
})

document.querySelector('#newDomain').addEventListener('change', async (e) => {
  try {
    const res = await domainResolution(e.target.value)
    if (res) {
      document.getElementById('domain-msg').innerHTML = `<small class="domain">${res}</small>`
    } else {
      document.getElementById('domain-msg').innerHTML = '<small class="domain-error">Invalid domain</small>'
    }

  } catch (e) {
    document.getElementById('domain-msg').innerHTML = '<small class="domain-error">Invalid domain</small>'
  }
})


document
  .querySelector("#newProductBtn")
  .addEventListener("click", async (e) => {
    if(!localStorage.getItem('address')) return alert('Login with Unstoppable to continue')

    const params = [
      document.getElementById("newProductName").value,
      document.getElementById("newImgUrl").value,
      document.getElementById("newProductDescription").value,
      document.getElementById("newDomain").value,
      document.getElementById("newPrice").value ? new BigNumber(document.getElementById("newPrice").value)
      .shiftedBy(ERC20_DECIMALS)
      .toString() : ''
    ]

    if (params.some(param => param === '')) return notification(`⚠️ All fields are required.`)
    notification(`⌛ Adding "${params[0]}"...`)

    const accounts = await ethereum.request({
      method: 'eth_requestAccounts',
    });

    const tx = {
      from: accounts[0],
      to: MPContractAddress,
      gas: 500000,
      data: contract.methods.writeProduct(...params).encodeABI()

    }

    try {

      const signature = await web3.eth.accounts.signTransaction(tx, process.env.PRIVATE_KEY)
      web3.eth.sendSignedTransaction(signature.rawTransaction).on('receipt', receipt => {
        if(receipt) {
          getProducts()
          notification(`🎉 You successfully added "${params[0]}".`)
          document.querySelector('#product-form').reset()
        }
      })
    } catch (error) {
      notification(`⚠️ ${error}.`)
      }
  })

  document.querySelector("#marketplace").addEventListener("click", async (e) => {
    if (e.target.className.includes("buyBtn")) {
      let data = e.target.id
      data = data.split('-')

      notification(`⌛ Awaiting payment for "${products[data[0]].name}"...`)
      try {
        const accounts = await ethereum.request({
          method: 'eth_requestAccounts',
        });

        const tx = {
          from: accounts[0],
          to: MPContractAddress,
          data: contract.methods.buyProduct(data[0]).encodeABI()
        }



        const txHash = await window.ethereum.request({
          method: "eth_sendTransaction",
          params: [tx],
        })
        if(txHash) {

          web3.eth.getTransactionReceipt(txHash)
            .then((receipt) => {
              getProducts()
              getBalance()
              notification(`🎉 You successfully bought "${products[data[0]].name}".`)
            })

        }


      } catch (error) {
        notification(`⚠️ Could not place order.`)
      }
    }

    if (e.target.className.includes('tip-address')) {
      const domain = e.target.innerText
      const address = await domainResolution(domain)
      if (address) {
        let modal = new bootstrap.Modal(document.getElementById("tipModal"), {});
        modal.show();
        document.querySelector('#vendorAddress').value = domain
        document.querySelector('#resolvedAddress').value = address
      }
    }
  })

window.login = async () => {
  try {
    const res = await uauth.loginWithPopup()
    if (res) {

      localStorage.setItem('address', res.idToken.sub)
      localStorage.setItem('wallet_address', res.idToken.wallet_address)
      notification("⌛ Loading...")
      await getContract()
      await getBalance()
      await getProducts()
      notificationOff()

      let el = document.querySelector('.dropdown-btn')
      el.classList.remove('d-none')
      document.querySelector('.username').innerHTML = localStorage.getItem('address')
      document.querySelector('.login').style.display = 'none'
    }
  } catch (error) {
    console.error(error)
  }
}

window.logout = async () => {
  try {
    await uauth.logout()
    localStorage.removeItem('address')
    let el = document.querySelector('.dropdown-btn')
    el.classList.add('d-none')
    window.location.reload()


  } catch (error) {
    console.error(error)
  }
}


function loginBtn() {
  const btn = document.createElement('button')
  btn.innerText = 'Login with Unstoppable'
  btn.className = 'btn login'
  btn.setAttribute('onclick', 'login()')
  document.getElementById("action-btn").appendChild(btn)
}

window.addEventListener("load", async () => {
  if (localStorage.getItem('address')) {

    await getContract()
    await getBalance()
    await getProducts()

    notificationOff()

    let el = document.querySelector('.dropdown-btn')
    el.classList.remove('d-none')
    document.querySelector('.username').innerHTML = localStorage.getItem('address')


  } else {
    loginBtn()
  }
})