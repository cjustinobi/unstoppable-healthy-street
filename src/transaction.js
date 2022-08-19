import { ethers } from 'ethers'

export const sendTx = async  (reciever, amount) => {

  const ethereum = window.ethereum;

  if(ethereum){

    try{
      const provider = new ethers.providers.Web3Provider(ethereum);
      const accounts = await ethereum.request({ method: 'eth_accounts' });

      const transaction = [{
        from: accounts[0],
        to: reciever,
        value: ethers.utils.parseUnits(amount, 'ether').toHexString(),
        gasLimit: ethers.utils.hexlify(100000),
        gasPrice: ethers.utils.hexlify(parseInt(await provider.getGasPrice())),
      }]

      const transactionHash = await provider.send('eth_sendTransaction', transaction)
      console.log(`Txn Hash: ${transactionHash}`)
    } catch(err){
      console.log(err)
    }
  } else {
    console.log('Metamask not detected')
  }

}