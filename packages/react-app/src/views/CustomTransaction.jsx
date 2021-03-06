import { CaretUpOutlined, ScanOutlined, SendOutlined, ReloadOutlined } from "@ant-design/icons";
import { JsonRpcProvider, StaticJsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import { formatEther, parseEther } from "@ethersproject/units";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { Alert, Button, Col, Row, Select, Input, Modal, notification, Space, Popconfirm } from "antd";
import "antd/dist/antd.css";
import { useUserAddress } from "eth-hooks";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import Web3Modal from "web3modal";
import "../App.css";
import {
  Account,
  Address,
  AddressInput,
  Balance,
  EtherInput,
  Faucet,
  GasGauge,
  Header,
  QRPunkBlockie,
  Ramp,
  SpeedUpTransactions,
  Wallet,
  Complete,

} from "../components";
import { INFURA_ID, NETWORK, NETWORKS } from "../constants";
import { Transactor } from "../helpers";
import { useBalance, useGasPrice, usePoller, useUserProviderAndSigner } from "eth-hooks";
import { useExchangePrice, useLocalStorage } from "../hooks"
import WalletConnect from "@walletconnect/client";
import { useHistory } from "react-router-dom";
import { TransactionManager } from "../helpers/TransactionManager";
import ERC20 from "../contracts/ERC20.json";
const { confirm } = Modal;
const { Option } = Select;
const { ethers } = require("ethers");

const TOKEN_LIST = 'https://gateway.ipfs.io/ipns/tokens.uniswap.org'

/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/austintgriffith/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
//const cachedNetwork = window.localStorage.getItem("network");
//let targetNetwork = NETWORKS[cachedNetwork || "ethereum"]; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)
/*if (!targetNetwork) {
  targetNetwork = NETWORKS.xdai;
}*/
// 😬 Sorry for all the console logging
const DEBUG = false;

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
//
// attempt to connect to our own scaffold eth rpc and if that fails fall back to infura...
// Using StaticJsonRpcProvider as the chainId won't change see https://github.com/ethers-io/ethers.js/issues/901
const scaffoldEthProvider = new StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544");
//const mainnetInfura = new StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID);
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_I

// 🏠 Your local provider is usually pointed at your local blockchain
//const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
//const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
//if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
//let localProvider = new StaticJsonRpcProvider(localProviderUrlFromEnv);


// 🔭 block explorer URL
//const blockExplorer = targetNetwork.blockExplorer;

let scanner;

/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  // network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
        rpc: {
          10: "https://mainnet.optimism.io", // xDai
          100: "https://rpc.gnosischain.com", // xDai
          137: "https://polygon-rpc.com",
          31337: "http://localhost:8545",
          42161: "https://arb1.arbitrum.io/rpc",
          80001: "https://rpc-mumbai.maticvigil.com"
        },
      },
    },
  },
});


function CustomTransaction({
  readContracts,
  contractName,
  address,
  injectedProvider,
  targetNetwork,
  localProvider,
  blockExplorer,
  mainnetProvider
}) {


  //const mainnetProvider = scaffoldEthProvider //scaffoldEthProvider && scaffoldEthProvider._network ?  : mainnetInfura;

  const history = useHistory();

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if(injectedProvider && injectedProvider.provider && injectedProvider.provider.disconnect){
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };
/*
  // track an extra eth price to display USD for Optimism?
  const ethprice = useExchangePrice({
    name: "ethereum",
    color: "#ceb0fa",
    chainId: 1,
    price: "uniswap",
    rpcUrl: `https://mainnet.infura.io/v3/${INFURA_ID}`,
    blockExplorer: "https://etherscan.io/",
  }, mainnetProvider);
  console.log("ethprice",ethprice)*/

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangePrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, true);
  const userSigner = userProviderAndSigner.signer;
  //const address = useUserAddress(userProviderAndSigner);
  const contractAddress = readContracts[contractName] ? readContracts[contractName].address : '';
  console.log("CUSTOMUSERPRIVIDERANDSIGNER: ", userProviderAndSigner);

  //let calldata = readContracts[""];
  let iface = new ethers.utils.Interface(ERC20.abi);


  //console.log("erc20 readContracts", calldata);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId = userProviderAndSigner && userProviderAndSigner.provider && userProviderAndSigner.provider._network && userProviderAndSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);
console.log("tx: ", tx)
console.log("usersigner tx", userSigner);
console.log("gas price tx: ", gasPrice)
  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, contractAddress);

  const balance = yourLocalBalance && formatEther(yourLocalBalance);

  const [amount, setAmount] = useLocalStorage("amount", "0");
  const [data, setData] = useLocalStorage("data","0x");
  const [to, setTo] = useLocalStorage("to");

  const [walletConnectTx, setWalletConnectTx] = useState();

  const [loading, setLoading] = useState(false);

  const [customTokenAddress, setCustomTokenAddress] = useState();
  const [custTokenSymbol, setCustTokenSymbol] = useState();
  const [custTokenName, setCustTokenName] = useState();
  const [custTokenBalance, setCustTokenBalance] = useState();
  const [tokDecimals, setTokDecimals] = useState();
  const [transferToAddress, setTransferToAddress] = useState();
  const [transferAmount, setTransferAmount] = useState();
  const [formattedTransferAmount, setFormattedTransferAmount] = useState();
  const [methodName, setMethodName] = useState("transfer");
  const [tokenMenuVisibility, setTokenMenuVisibility] = useState("hidden");

  const handleTransferTo = async (e) => {
    let enteredTo = e.target.value;
    if (ethers.utils.isAddress(enteredTo)) {
      setTransferToAddress(enteredTo)
    } else setTransferToAddress('');
  }

  const handleTransferAmount = async (e) => {
    let enteredAmount = e.target.value;
    setTransferAmount(enteredAmount)
    let enteredAmountFormatted = ethers.utils.parseUnits(enteredAmount, tokDecimals);
    setFormattedTransferAmount(enteredAmountFormatted);
  }

  const handleCustomToken = async (e) => {
    let enteredAddress = e.target.value;
    if (ethers.utils.isAddress(enteredAddress)) {
      const customContract = new ethers.Contract(enteredAddress, ERC20.abi, localProvider);
        setCustomTokenAddress(enteredAddress)
      const newCustTokenSymbol = await customContract.functions.symbol();
      const newCustTokenName = await customContract.functions.name();
      const newCustTokenBalance = await customContract.functions.balanceOf(contractAddress);
      const newTokDecimals = await customContract.functions.decimals();
      const newCustTokBalFormatted = ethers.utils.formatUnits(newCustTokenBalance[0], newTokDecimals);
      console.log('tokBal', newCustTokBalFormatted);
      setCustTokenSymbol(newCustTokenSymbol);
      setCustTokenName(newCustTokenName);
      setCustTokenBalance(newCustTokBalFormatted);
      setTokDecimals(newTokDecimals);
      setTokenMenuVisibility("visible")
    } else {
      setCustTokenSymbol('');
      setCustTokenName('');
      setCustTokenBalance('');
      setTokenMenuVisibility("hidden")
    }
    console.log("customtokenaddress", customTokenAddress);
  }

  const connectWallet = (sessionDetails)=>{
    console.log(" 📡 Connecting to Wallet Connect....",sessionDetails)

    const connector = new WalletConnect(sessionDetails);

    setWallectConnectConnector(connector)

    // Subscribe to session requests
    connector.on("session_request", (error, payload) => {
      if (error) {
        throw error;
      }

      console.log("SESSION REQUEST")
      // Handle Session Request

      connector.approveSession({
        accounts: [                 // required
          contractAddress
        ],
        chainId: targetNetwork.chainId               // required
      })

      setConnected(true)
      setWallectConnectConnectorSession(connector.session)
    });

    // Subscribe to call requests
    connector.on("call_request", async (error, payload) => {
      if (error) {
        throw error;
      }

      console.log("REQUEST PERMISSION TO:",payload,payload.params[0])

      //setWalletModalData({payload:payload,connector: connector})
      if (payload.method === 'eth_sendTransaction') {
        confirm({
            width: "90%",
            size: "large",
            title: 'Create Transaction?',
            icon: <SendOutlined/>,
            content: <pre>{payload && JSON.stringify(payload.params, null, 2)}</pre>,
            onOk:async ()=>{
              console.log("PAYLOAD",payload)
              let calldata = payload.params[0].data;
              console.log("calldata",calldata)
              setData(calldata)
              const payloadValue = payload.params[0].value ? ethers.utils.formatUnits(ethers.BigNumber.from(payload.params[0].value)) : 0;
              setAmount(payloadValue)
              console.log("PAYLOADAMOUNT1", amount)
              setTo(payload.params[0].to)
              setTimeout(()=>{
                history.push('/create')
              },777);
            },
            onCancel: ()=>{
              console.log('Cancel');
            },
          });
        }
      else if (payload.method === 'eth_signTypedData_v4') {
        const payloadParams = JSON.parse(payload.params[1]);
        if (payloadParams.primaryType === "Permit") {
          const tokenContract = payloadParams.domain.verifyingContract;
          const spenderAddress = payloadParams.message.spender;
          const tokenAmount = payloadParams.message.value;
          const calldata = iface.encodeFunctionData("approve", [ spenderAddress, tokenAmount ]);
          //let calldata = "0x095ea7b3000000000000000000000000" + spenderAddress.slice(2) + "000000000000000000000000000000000000000000000000" + tokenAmount.slice(2);

          console.log("calldata:", calldata)
          confirm({
              width: "90%",
              size: "large",
              title: 'Approve Token Spend',
              icon: <SendOutlined/>,
              content: <pre>{payloadParams && JSON.stringify(payloadParams.domain, null, 2) + JSON.stringify(payloadParams.message, null, 2)}</pre>,
              onOk:async ()=>{

                setData(calldata)
                setTo(tokenContract)
                setTimeout(()=>{
                  history.push('/create')
                },777);
              },
              onCancel: ()=>{
                console.log('Cancel');
              },
            });
        }
        else console.log("signTypedData payloads only work for token approvals");
      }

    });

    connector.on("disconnect", (error, payload) => {
      if (error) {
        throw error;
      }
      console.log("disconnect")

      setTimeout(() => {
        window.location.reload();
      }, 1);

      // Delete connector
    });
  }

  const [ walletConnectUrl, setWalletConnectUrl ] = useLocalStorage("walletConnectUrl")
  const [ connected, setConnected ] = useState()

  const [ wallectConnectConnector, setWallectConnectConnector ] = useState()
  //store the connector session in local storage so sessions persist through page loads ( thanks Pedro <3 )
  const [ wallectConnectConnectorSession, setWallectConnectConnectorSession ] = useLocalStorage("wallectConnectConnectorSession")
  console.log("wallet connect url: ", walletConnectUrl);
  console.log("connected: ", connected);
  useEffect(()=>{
    console.log("im here zzzzz")
    if(!connected){
      let nextSession = localStorage.getItem("wallectConnectNextSession")
      console.log("next session: ", nextSession);
      if(nextSession){
        localStorage.removeItem("wallectConnectNextSession")
        console.log("FOUND A NEXT SESSION IN CACHE")
        setWalletConnectUrl(nextSession)
      }else if(wallectConnectConnectorSession){
        console.log("NOT CONNECTED AND wallectConnectConnectorSession",wallectConnectConnectorSession)
        connectWallet( wallectConnectConnectorSession )
        setConnected(true)
      }else if(walletConnectUrl/*&&!walletConnectUrlSaved*/){
        //CLEAR LOCAL STORAGE?!?
        console.log("clear local storage and connect...")
        localStorage.removeItem("walletconnect") // lololol
        connectWallet(      {
                // Required
                uri: walletConnectUrl,
                // Required
                clientMeta: {
                  description: "Forkable web wallet for small/quick transactions.",
                  url: "https://punkwallet.io",
                  icons: ["https://punkwallet.io/punk.png"],
                  name: "🧑‍🎤 PunkWallet.io",
                },
              }/*,
              {
                // Optional
                url: "<YOUR_PUSH_SERVER_URL>",
                type: "fcm",
                token: token,
                peerMeta: true,
                language: language,
              }*/)
      }
    }
  },[ walletConnectUrl ])


  useMemo(() => {
    if (window.location.pathname) {
      if (window.location.pathname.indexOf("/wc") >= 0) {
        console.log("WALLET CONNECT!!!!!",window.location.search)
        let uri = window.location.search.replace("?uri=","")
        console.log("WC URI:",uri)
        setWalletConnectUrl(uri)
      }
    }
  }, [injectedProvider, localProvider]);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, contractAddress);

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  /*
  useEffect(()=>{
    if(DEBUG && mainnetProvider && address && selectedChainId && yourLocalBalance && yourMainnetBalance && readContracts && writeContracts && mainnetDAIContract){
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________")
      console.log("🌎 mainnetProvider",mainnetProvider)
      console.log("🏠 localChainId",localChainId)
      console.log("👩‍💼 selected address:",address)
      console.log("🕵🏻‍♂️ selectedChainId:",selectedChainId)
      console.log("💵 yourLocalBalance",yourLocalBalance?formatEther(yourLocalBalance):"...")
      console.log("💵 yourMainnetBalance",yourMainnetBalance?formatEther(yourMainnetBalance):"...")
      console.log("📝 readContracts",readContracts)
      console.log("🌍 DAI contract on mainnet:",mainnetDAIContract)
      console.log("🔐 writeContracts",writeContracts)
    }
  }, [mainnetProvider, address, selectedChainId, yourLocalBalance, yourMainnetBalance, readContracts, writeContracts, mainnetDAIContract])
  */

  let networkDisplay = "";
  if (localChainId && selectedChainId && localChainId !== selectedChainId) {
    const networkSelected = NETWORK(selectedChainId);
    const networkLocal = NETWORK(localChainId);
    if (selectedChainId === 1337 && localChainId === 31337) {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network ID"
            description={
              <div>
                You have <b>chain id 1337</b> for localhost and you need to change it to <b>31337</b> to work with
                HardHat.
                <div>(MetaMask -&gt; Settings -&gt; Networks -&gt; Chain ID -&gt; 31337)</div>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    } else {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network"
            description={
              <div>
                You have <b>{networkSelected && networkSelected.name}</b> selected and you need to be on{" "}
                <b>{networkLocal && networkLocal.name}</b>.
                <Button
                  style={{marginTop:4}}
                  onClick={async () => {
                    const ethereum = window.ethereum;
                    const data = [
                      {
                        chainId: "0x" + targetNetwork.chainId.toString(16),
                        chainName: targetNetwork.name,
                        nativeCurrency: targetNetwork.nativeCurrency,
                        rpcUrls: [targetNetwork.rpcUrl],
                        blockExplorerUrls: [targetNetwork.blockExplorer],
                      },
                    ];
                    console.log("data", data);

                    let switchTx;

                    try {
                      console.log("first trying to add...")
                      switchTx = await ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: data,
                      });
                    } catch (addError) {
                      // handle "add" error
                      console.log("error adding, trying to switch")
                      try {
                        console.log("Trying a switch...")
                        switchTx = await ethereum.request({
                          method: "wallet_switchEthereumChain",
                          params: [{ chainId: data[0].chainId }],
                        });
                      } catch (switchError) {
                        // not checking specific error code, because maybe we're not using MetaMask

                      }
                    }
                    // https://docs.metamask.io/guide/rpc-api.html#other-rpc-methods


                    if (switchTx) {
                      console.log(switchTx);
                    }
                  }}
                >
                  <span style={{paddingRight:4}}>switch to</span>  <b>{NETWORK(localChainId).name}</b>
                </Button>

              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    }
  } else {
    networkDisplay = (
      <div style={{ zIndex: -1, position: "absolute", right: 154, top: 28, padding: 16, color: targetNetwork.color }}>
        {targetNetwork.name}
      </div>
    );
  }


  return (
    <div className="CustomTransaction">
      <div className="site-page-header-ghost-wrapper">
        <h1>ERC20 Interactions</h1>
      </div>

      <div style={{ clear: "both", width: 360, margin: "auto" ,marginTop:12, position:"relative" }}>
        <Input
          placeholder={"enter token address"}
          onChange={handleCustomToken}
        />
      </div>

      <div style={{ clear: "both", width: 350, margin: "auto" ,marginTop:12, position:"relative" }}>
        {custTokenSymbol ? <>Symbol: &nbsp; {custTokenSymbol}     </> : ''}
        <>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; </>
        {custTokenName ? <> Name: &nbsp; {custTokenName}</> : ''}
        <br />
        {custTokenBalance ? <>Balance: &nbsp; {custTokenBalance}</> : ''}
      </div>

      <div style={{border:"1px solid #cccccc", padding:16, width:400, margin:"auto",marginTop:12, visibility:tokenMenuVisibility }}>
        <div style={{margin:8,padding:8}}>
          <Select value={methodName} style={{ width: "100%" }} onChange={ setMethodName }>
            <Option key="transfer">Transfer</Option>
            <Option key="approve">Approve</Option>
          </Select>
        </div>
        <div style={{margin:8,padding:8}}>
          <AddressInput
            autoFocus
            ensProvider={mainnetProvider}
            placeholder={methodName == "transfer" ? "to" : "spender"}
            value={transferToAddress}
            onChange={setTransferToAddress}
          />
        </div>
        <div style={{margin:8,padding:8}}>
          <Input
            ensProvider={mainnetProvider}
            placeholder="amount"
            value={transferAmount}
            onChange={handleTransferAmount}
          />
        </div>
        <div style={{margin:8,padding:8}}>
          <Button
            disabled={transferAmount && transferToAddress && methodName ? false : true}
            onClick={()=>{
              if (transferAmount && transferToAddress && methodName) {
                console.log("METHOD",setMethodName)
                let calldata = iface.encodeFunctionData(methodName,[transferToAddress, formattedTransferAmount])
                console.log("calldata",calldata)
                setData(calldata)
                setAmount("0")
                setTo(customTokenAddress)
                setTimeout(()=>{
                  history.push('/create')
                },777)
              }
            }}
          >
          Create Tx
          </Button>
        </div>
      </div>


      <div style={{ clear: "both", width: 500, margin: "auto" ,marginTop:48, position:"relative"}}>
        {connected?<span style={{cursor:"pointer",padding:8,fontSize:30,position:"absolute",top:-16,left:28}}>✅</span>:""}
        <Input
          style={{width:"70%"}}
          placeholder={"wallet connect url (or use the scanner-->)"}
          value={walletConnectUrl}
          disabled={connected}
          onChange={(e)=>{
            setWalletConnectUrl(e.target.value)
          }}
        />{connected?<span style={{cursor:"pointer",padding:10,fontSize:30,position:"absolute", top:-18}} onClick={()=>{
          setConnected(false);
          if(wallectConnectConnector) wallectConnectConnector.killSession();
          localStorage.removeItem("walletConnectUrl")
          localStorage.removeItem("wallectConnectConnectorSession")
        }}>🗑</span>:""}
      </div>

      <div style={{ zIndex: -1, paddingTop: 12, opacity: 0.5, fontSize: 12 }}>
        <Button
          style={{ margin:8, marginTop: 16 }}
          onClick={() => {
            window.open("https://zapper.fi/account/"+contractAddress+"?tab=history");
          }}
        >
          <span style={{ marginRight: 8 }}>📜</span>History
        </Button>

        <Button
          style={{  margin:8, marginTop: 16, }}
          onClick={() => {
            window.open("https://zapper.fi/account/"+contractAddress);
          }}
        >
          <span style={{ marginRight: 8 }}>👛</span> Inventory
        </Button>

      </div>


      <div style={{ zIndex: -1, padding: 12, opacity: 0.5, fontSize: 12 }}>
        created with <span style={{ marginRight: 4 }}>🏗</span>
        <a href="https://github.com/austintgriffith/scaffold-eth#-scaffold-eth" target="_blank">
          scaffold-eth
        </a>
      </div>
      <div style={{ padding: 32 }} />

      <div
        style={{
          transform: "scale(2.7)",
          transformOrigin: "70% 80%",
          position: "fixed",
          textAlign: "right",
          right: 0,
          bottom: 16,
          padding: 10,
        }}
      >
        <Button
          type="primary"
          shape="circle"
          style={{backgroundColor:targetNetwork.color,borderColor:targetNetwork.color}}
          size="large"
          onClick={() => {
            scanner(true);
          }}
        >
          <ScanOutlined style={{ color: "#FFFFFF" }} />
        </Button>
      </div>


    </div>
  );
}



export default CustomTransaction;
