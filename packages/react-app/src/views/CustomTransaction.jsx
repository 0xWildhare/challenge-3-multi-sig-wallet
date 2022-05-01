import { CaretUpOutlined, ScanOutlined, SendOutlined, ReloadOutlined } from "@ant-design/icons";
import { JsonRpcProvider, StaticJsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import { formatEther, parseEther } from "@ethersproject/units";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { Alert, Button, Col, Row, Select, Input, Modal, notification } from "antd";
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
} from "../components";
import { INFURA_ID, NETWORK, NETWORKS } from "../constants";
import { Transactor } from "../helpers";
import { useBalance, useGasPrice, usePoller, useUserProviderAndSigner } from "eth-hooks";
import { useExchangePrice, useLocalStorage } from "../hooks"
import WalletConnect from "@walletconnect/client";
import { useHistory } from "react-router-dom";
import { TransactionManager } from "../helpers/TransactionManager";

const { confirm } = Modal;

const { ethers } = require("ethers");


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

  // if you don't have any money, scan the other networks for money
  // lol this poller is a bad idea why does it keep
  /*usePoller(() => {
    if (!cachedNetwork) {
      if (balance == 0) {
        checkBalances(address);
      }
    }
  }, 7777);*/

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

      /* payload:
      {
        id: 1,
        jsonrpc: '2.0'.
        method: 'session_request',
        params: [{
          peerId: '15d8b6a3-15bd-493e-9358-111e3a4e6ee4',
          peerMeta: {
            name: "WalletConnect Example",
            description: "Try out WalletConnect v1.0",
            icons: ["https://example.walletconnect.org/favicon.ico"],
            url: "https://example.walletconnect.org"
          }
        }]
      }
      */
    });

    // Subscribe to call requests
    connector.on("call_request", async (error, payload) => {
      if (error) {
        throw error;
      }

      console.log("REQUEST PERMISSION TO:",payload,payload.params[0])
      // Handle Call Request
      //console.log("SETTING TO",payload.params[0].to)

      //setWalletConnectTx(true)

      //setToAddress(payload.params[0].to)
      //setData(payload.params[0].data?payload.params[0].data:"0x0000")

      //let bigNumber = ethers.BigNumber.from(payload.params[0].value)
      //console.log("bigNumber",bigNumber)

      //let newAmount = ethers.utils.formatEther(bigNumber)
      //console.log("newAmount",newAmount)
      //if(props.price){
      //  newAmount = newAmount.div(props.price)
      //}
      //setAmount(newAmount)

      /* payload:
      {
        id: 1,
        jsonrpc: '2.0'.
        method: 'eth_sign',
        params: [
          "0xbc28ea04101f03ea7a94c1379bc3ab32e65e62d3",
          "My email is john@doe.com - 1537836206101"
        ]
      }
      */


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
          const tokenAmount = ethers.BigNumber.from(payloadParams.message.value)._hex;

          let calldata = "0x095ea7b3000000000000000000000000"+spenderAddress.slice(2)+"000000000000000000000000000000000000000000000000"+tokenAmount.slice(2);
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

      //setIsWalletModalVisible(true)
      //if(payload.method == "personal_sign"){
      //  console.log("SIGNING A MESSAGE!!!")
        //const msg = payload.params[0]
      //}
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


  /*
  setTimeout(()=>{
    if(!cachedNetwork){
      if(balance==0){
        checkBalances(address)
      }
    }
  },1777)
  setTimeout(()=>{
    if(!cachedNetwork){
      if(balance==0){
        checkBalances(address)
      }
    }
  },3777)
*/

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
/*
  const options = [];
  for (const id in NETWORKS) {
    options.push(
      <Select.Option key={id} value={NETWORKS[id].name}>
        <span style={{ color: NETWORKS[id].color, fontSize: 24 }}>{NETWORKS[id].name}</span>
      </Select.Option>,
    );
  }

  const networkSelect = (
    <Select
      size="large"
      defaultValue={targetNetwork.name}
      style={{ textAlign: "left", width: 170, fontSize: 30 }}
      onChange={value => {
        if (targetNetwork.chainId != NETWORKS[value].chainId) {
          window.localStorage.setItem("network", value);
          setTimeout(() => {
            window.location.reload();
          }, 1);
        }
      }}
    >
      {options}
    </Select>
  );
*/


  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname);
  }, [setRoute]);
/*
  let faucetHint = "";
  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name == "localhost";

  const [faucetClicked, setFaucetClicked] = useState(false);
  if (
    !faucetClicked &&
    localProvider &&
    localProvider._network &&
    localProvider._network.chainId == 31337 &&
    yourLocalBalance &&
    formatEther(yourLocalBalance) <= 0
  ) {
    faucetHint = (
      <div style={{ padding: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            faucetTx({
              to: address,
              value: parseEther("0.01"),
            });
            setFaucetClicked(true);
          }}
        >
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    );
  }
  */

  let startingAddress = "";
  if (window.location.pathname) {
    const incoming = window.location.pathname.replace("/", "");
    if (incoming && ethers.utils.isAddress(incoming)) {
      startingAddress = incoming;
      window.history.pushState({}, "", "/");
    }

    /* let rawPK
    if(incomingPK.length===64||incomingPK.length===66){
      console.log("🔑 Incoming Private Key...");
      rawPK=incomingPK
      burnerConfig.privateKey = rawPK
      window.history.pushState({},"", "/");
      let currentPrivateKey = window.localStorage.getItem("metaPrivateKey");
      if(currentPrivateKey && currentPrivateKey!==rawPK){
        window.localStorage.setItem("metaPrivateKey_backup"+Date.now(),currentPrivateKey);
      }
      window.localStorage.setItem("metaPrivateKey",rawPK);
    } */
  }
  // console.log("startingAddress",startingAddress)
  const [amount, setAmount] = useLocalStorage("amount", "0");
  const [data, setData] = useLocalStorage("data","0x");
  const [to, setTo] = useLocalStorage("to");
  const [toAddress, setToAddress] = useLocalStorage("punkWalletToAddress", startingAddress, 120000);

  const [walletConnectTx, setWalletConnectTx] = useState();

  const [loading, setLoading] = useState(false);

  const [depositing, setDepositing] = useState();
  const [depositAmount, setDepositAmount] = useState();

/*
  const handleOk = async () => {
    setIsWalletModalVisible(false);

    let result = await userProvider.send(walletModalData.payload.method, walletModalData.payload.params)

    //console.log("MSG:",ethers.utils.toUtf8Bytes(msg).toString())

    //console.log("payload.params[0]:",payload.params[1])
    //console.log("address:",address)

    //let userSigner = userProvider.getSigner()
    //let result = await userSigner.signMessage(msg)
    console.log("RESULT:",result)


    walletModalData.connector.approveRequest({
      id: walletModalData.payload.id,
      result: result
    });

    notification.info({
      message: "Wallet Connect Transaction Sent",
      description: result.hash,
      placement: "bottomRight",
    });
  };

  const handleCancel = () => {
    setIsWalletModalVisible(false);
  };

*/

  const walletDisplay =
    web3Modal && web3Modal.cachedProvider ? (
      ""
    ) : (
      <Wallet address={contractAddress} provider={userProviderAndSigner.provider} ensProvider={mainnetProvider} price={price} />
    );

  return (
    <div className="CustomTransaction">
      <div className="site-page-header-ghost-wrapper">

      </div>



      <div style={{ zIndex: -1, paddingTop: 128, opacity: 0.5, fontSize: 12 }}>
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

      <div style={{ clear: "both", width: 500, margin: "auto" ,marginTop:32, position:"relative"}}>
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


      { targetNetwork.name=="ethereum" ? <div style={{ zIndex: -1, padding: 64, opacity: 0.5, fontSize: 12 }}>
        {
          depositing ? <div style={{width:200,margin:"auto"}}>
            <EtherInput
              /*price={price || targetNetwork.price}*/
              value={depositAmount}
              token={targetNetwork.token || "ETH"}
              onChange={value => {
                setDepositAmount(value);
              }}
            />
            <Button
              style={{ margin:8, marginTop: 16 }}
              onClick={() => {
                console.log("DEPOSITING",depositAmount)
                tx({
                  to: "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1",
                  value: ethers.utils.parseEther(depositAmount),
                  gasLimit: 175000,
                  gasPrice: gasPrice,
                  data: "0xb1a1a882000000000000000000000000000000000000000000000000000000000013d62000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000"
                })
                setDepositAmount()
                setDepositing()
              }}
            >
              <span style={{ marginRight: 8 }}>🔴</span>Deposit
            </Button>
          </div>:<div>
            <Button
              style={{ margin:8, marginTop: 16 }}
              onClick={() => {
                setDepositing(true)
                /*tx({
                  to: "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1",
                  value: ethers.utils.parseEther("0.01"),
                  gasLimit: 175000,
                  gasPrice: gasPrice,
                  data: "0xb1a1a882000000000000000000000000000000000000000000000000000000000013d62000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000"
                })*/
              }}
            >
              <span style={{ marginRight: 8 }}>🔴</span>Deposit to OE
            </Button>
          </div>
        }
      </div> : ""}


      <div style={{ zIndex: -1, padding: 64, opacity: 0.5, fontSize: 12 }}>
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

{/*

      <Modal title={walletModalData && walletModalData.payload && walletModalData.payload.method} visible={isWalletModalVisible} onOk={handleOk} onCancel={handleCancel}>
       <pre>
        {walletModalData && walletModalData.payload && JSON.stringify(walletModalData.payload.params, null, 2)}
       </pre>
     </Modal>
  */}


      {/* 🗺 Extra UI like gas price, eth price, faucet, and support:
      <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
        <Row align="middle" gutter={[16, 16]}>
          <Col span={12}>
            <Ramp price={price} address={address} networks={NETWORKS} />
          </Col>

          {targetNetwork.name=="arbitrum"||targetNetwork.name=="gnosis"||targetNetwork.name=="optimism"||targetNetwork.name=="polygon"?"":<Col span={12} style={{ textAlign: "center", opacity: 0.8 }}>
            <GasGauge gasPrice={gasPrice} />
          </Col>}
        </Row>

        <Row align="middle" gutter={[4, 4]}>
          <Col span={24}>
            {faucetAvailable ? (
              <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider} />
            ) : (
              ""
            )}
          </Col>
        </Row>
      </div>*/}
    </div>
  );
}

/* eslint-disable */
window.ethereum &&
  window.ethereum.on("chainChanged", chainId => {
    web3Modal.cachedProvider &&
      setTimeout(() => {
        window.location.reload();
      }, 3000);
  });

window.ethereum &&
  window.ethereum.on("accountsChanged", accounts => {
    web3Modal.cachedProvider &&
      setTimeout(() => {
        window.location.reload();
      }, 1);
  });
/* eslint-enable */

export default CustomTransaction;
