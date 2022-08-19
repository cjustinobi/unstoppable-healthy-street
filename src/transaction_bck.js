import { createAlchemyWeb3 } from "@alch/alchemy-web3";

const web3 = createAlchemyWeb3(
  "https://eth-rinkeby.alchemyapi.io/v2/_XOLg3siUh9W7_4N6K3P-6XjJ-_GNfXa",
);

const PRIVATE_KEY = '02ed88b5c5cf0a2a99bc20cbe49b1381abf646271f14129b90aeed9b07df7c29'


export const sendTx = async (to, value) => {

  const ethereum = window.ethereum;

  if(ethereum) {

    const accounts = await ethereum.request({ method: 'eth_accounts' });
    const signedTx = await web3.eth.accounts.signTransaction({
      from: accounts[0],
      to,
      value: 100000000000000000 * value,
      gas: 30000,
    }, PRIVATE_KEY);

    const res = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log(res)
  } else {
    console.log('Please install Metamask')
  }
}
