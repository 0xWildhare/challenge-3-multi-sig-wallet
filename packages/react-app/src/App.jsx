import { Button, Col, Menu, Row, Alert, Select } from "antd";
import "antd/dist/antd.css";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import { useEventListener } from "eth-hooks/events";
import React, { useCallback, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation } from "react-router-dom";
import "./App.css";
import {
  Account,
  Contract,
  Faucet,
  GasGauge,
  Header,
  Ramp,
  ThemeSwitch,
  NetworkDisplay,
  FaucetHint,
  NetworkSwitch,
  QRPunkBlockie,
  CreateMultiSigModal
} from "./components";
import { NETWORKS, ALCHEMY_KEY } from "./constants";
import externalContracts from "./contracts/external_contracts";
import multiSigWallet from "./contracts/multiSigWallet.json";
import deployedContracts from "./contracts/hardhat_contracts.json";
import { Transactor, Web3ModalSetup } from "./helpers";
import {
  Home,
  Owners,
  Transactions,
  CreateTransaction,
  CustomTransaction,
  Subgraph } from "./views";
import { useStaticJsonRPC } from "./hooks";

import Gun from "gun";
//TODO: what does the "peers:" notation mean - need to research how this works
var gun = Gun({
    peers: ['http:localhost:8000/gun'] // Put your own relay node here. make sure you run yarn gun if you're on local
  }); //('http://gunjs.herokuapp.com/gun') // or use your own GUN relay

const { ethers } = require("ethers");

const { Option } = Select;

const multiSigABI = multiSigWallet.abi;
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/scaffold-eth/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Alchemy.com & Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const initialNetwork = NETWORKS.localhost; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = true; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();

// 🛰 providers
const providers = [
  "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
  `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
  "https://rpc.scaffoldeth.io:48544",
];

// const poolServerUrl = "https://backend.multisig.holdings:49832/"
const poolServerUrl = "http://localhost:49832/";

function App(props) {
  // specify all the chains your app is available on. Eg: ['localhost', 'mainnet', ...otherNetworks ]
  // reference './constants.js' for other networks
  const networkOptions = [initialNetwork.name, "mainnet", "rinkeby"];

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [multiSigs, setMultiSigs] = useState([]);
  const [currentMultiSigAddress, setCurrentMultiSigAddress] = useState();
  const [signaturesRequired, setSignaturesRequired] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [contractNameForEvent, setContractNameForEvent] = useState();
  const [ownerEvents, setOwnerEvents] = useState();
  const [executeTransactionEvents, setExecuteTransactionEvents] = useState();


  const location = useLocation();

  const targetNetwork = NETWORKS[selectedNetwork];

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : targetNetwork.rpcUrl,
  ]);

  const mainnetProvider = useStaticJsonRPC(providers);

  if (DEBUG) console.log(`Using ${selectedNetwork} network`);

  // 🛰 providers
  if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, USE_BURNER_WALLET);
  const userSigner = userProviderAndSigner.signer;

  console.log("SIGNERANDPROVIDER: ", userProviderAndSigner);
  console.log("SIGNER: ", userSigner);

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);
console.log("app tx: ", tx)
  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  // const contractConfig = useContractConfig();

  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);

  const contractName = "MultiSig";
  const contractAddress = readContracts?.MultiSig?.address;

  const signaturesRequiredContract = useContractReader(readContracts, contractName, "signaturesRequired");
  const nonceContract = useContractReader(readContracts, contractName, "nonce");

  //📟 Listen for broadcast events
  const ownersMultiSigEvents = useEventListener(readContracts, "MultiSigFactory", "Owners", localProvider, 1);
  if(DEBUG) console.log("📟 ownersMultiSigEvents:", ownersMultiSigEvents);

  useEffect(() => {
    if (address) {
      const multiSigsForUser = ownersMultiSigEvents.reduce((filtered, createEvent) => {
        if (createEvent.args.owners.includes(address) && !filtered.includes(createEvent.args.contractAddress)) {
          filtered.push(createEvent.args.contractAddress);
        }

        return filtered;
      }, []);

      if (multiSigsForUser.length > 0) {
        const recentMultiSigAddress = multiSigsForUser[multiSigsForUser.length - 1];
        if (recentMultiSigAddress !== currentMultiSigAddress) setContractNameForEvent(null);
        setCurrentMultiSigAddress(recentMultiSigAddress);
        setMultiSigs(multiSigsForUser);
      }
    }
  }, [ownersMultiSigEvents, address]);

  useEffect(() => {
    setSignaturesRequired(signaturesRequiredContract);
    setNonce(nonceContract);
  }, [signaturesRequiredContract, nonceContract]);

  //📟 Listen for broadcast events
  const allExecuteTransactionEvents = useEventListener(currentMultiSigAddress ? readContracts : null, contractNameForEvent, "ExecuteTransaction", localProvider, 1);
  if(DEBUG) console.log("📟 executeTransactionEvents:", allExecuteTransactionEvents);

  const allOwnerEvents = useEventListener(currentMultiSigAddress ? readContracts : null, contractNameForEvent, "Owner", localProvider, 1);
  if(DEBUG) console.log("📟 ownerEvents:", allOwnerEvents);

  useEffect(() => {
    async function getContractValues() {
      const signaturesRequired = await readContracts.MultiSig.signaturesRequired();
      setSignaturesRequired(signaturesRequired);

      const nonce = await readContracts.MultiSig.nonce();
      setNonce(nonce);
    }
    if (currentMultiSigAddress) {
      readContracts.MultiSig = new ethers.Contract(currentMultiSigAddress, multiSigABI, localProvider);
      writeContracts.MultiSig = new ethers.Contract(currentMultiSigAddress, multiSigABI, userSigner);
      //console.log("readContracts", readContracts);
      setContractNameForEvent("multiSig");
      getContractValues();
    }
  }, [currentMultiSigAddress, readContracts, writeContracts]);

  useEffect(() => {
    setExecuteTransactionEvents(allExecuteTransactionEvents.filter( contractEvent => contractEvent.address === currentMultiSigAddress));
    setOwnerEvents(allOwnerEvents.filter( contractEvent => contractEvent.address === currentMultiSigAddress));
    //setDepositEvents(allDepositEvents.filter( contractEvent => contractEvent.address === currentMultiSigAddress));
    console.log("executetxnevents", executeTransactionEvents)
  }, [allExecuteTransactionEvents, allOwnerEvents, currentMultiSigAddress]);


  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);


  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });


  // keep track of a variable from the contract in the local React state:
  //const purpose = useContractReader(readContracts, "YourContract", "purpose");

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("🔐 writeContracts", writeContracts);
    }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
    localChainId,
    ]);
console.log("Injected2", injectedProvider);
  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));
console.log("Injected", injectedProvider);
    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;

  const userHasMultiSigs = currentMultiSigAddress ? true : false;

  const handleMultiSigChange = (value) => {
    setContractNameForEvent(null);
    setCurrentMultiSigAddress(value);
  }

  if(DEBUG) console.log("currentMultiSigAddress:", currentMultiSigAddress);

  return (
    <div className="App">
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header />
      <NetworkDisplay
        NETWORKCHECK={NETWORKCHECK}
        localChainId={localChainId}
        selectedChainId={selectedChainId}
        targetNetwork={targetNetwork}
        logoutOfWeb3Modal={logoutOfWeb3Modal}
        USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
      />
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 20 }}>
          <CreateMultiSigModal
            price={price}
            selectedChainId={selectedChainId}
            mainnetProvider={mainnetProvider}
            address={address}
            tx={tx}
            writeContracts={writeContracts}
            readContracts={readContracts}
            contractName={'MultiSigFactory'}
            isCreateModalVisible={isCreateModalVisible}
            setIsCreateModalVisible={setIsCreateModalVisible}
          />
          <Select value={[currentMultiSigAddress]} style={{ width: 120 }} onChange={handleMultiSigChange}>
            {multiSigs.map((address, index) => (
              <Option key={index} value={address}>{address}</Option>
            ))}
          </Select>
        </div>
      </div>
      <Menu disabled={!userHasMultiSigs} style={{ textAlign: "center", marginTop: 40 }} selectedKeys={[location.pathname]} mode="horizontal">
        <Menu.Item key="/">
          <Link to="/">Multisig</Link>
        </Menu.Item>
        <Menu.Item key="/owners">
          <Link to="/owners">Owners</Link>
        </Menu.Item>
        <Menu.Item key="/create">
          <Link to="/create">Create</Link>
        </Menu.Item>
        <Menu.Item key="/custom">
          <Link to="/custom">Custom</Link>
        </Menu.Item>
        <Menu.Item key="/pool">
          <Link to="/pool">Pool</Link>
        </Menu.Item>
        <Menu.Item key="/debug">
          <Link to="/debug">Debug</Link>
        </Menu.Item>
        <Menu.Item key="/subgraph">
          <Link to="/subgraph">Subgraph</Link>
        </Menu.Item>
      </Menu>

      <Switch>
        <Route exact path="/">
          {/* pass in any web3 props to this Home component. For example, yourLocalBalance */}
          {!userHasMultiSigs ?
            <Row style={{ marginTop: 40 }}>
              <Col span={12} offset={6}>
                <Alert message={<>✨ <Button onClick={() => setIsCreateModalVisible(true)} type="link" style={{ padding: 0 }}>Create</Button> or select your Multi-Sig ✨</>} type="info" />
              </Col>
            </Row>
          :
          <Home
            readContracts={readContracts}
            executeTransactionEvents={executeTransactionEvents}
            contractName={contractName}
            localProvider={localProvider}
            mainnetProvider={mainnetProvider}
            price={price}
            blockExplorer={blockExplorer}
            contractAddress={currentMultiSigAddress}
            signaturesRequired={signaturesRequired}
            ownerEvents={ownerEvents}
          />
        }
        </Route>
        <Route exact path="/debug">
          {/*
                🎛 this scaffolding is full of commonly used components
                this <Contract/> component will automatically parse your ABI
                and give you a form to interact with it locally
            */}

          <Contract
            name="MultiSig"
            price={price}
            signer={userSigner}
            provider={localProvider}
            address={address}
            blockExplorer={blockExplorer}
            contractConfig={contractConfig}
          />
        </Route>
        <Route path="/create">
          <CreateTransaction
            address={address}
            mainnetProvider={mainnetProvider}
            price={price}
            poolServerUrl={poolServerUrl}
            contractName={contractName}
            userSigner={userSigner}
            localProvider={localProvider}
            tx={tx}
            readContracts={readContracts}
            nonce={nonce}
            gun={gun}
          />
        </Route>
        <Route path="/custom">
          <CustomTransaction
          readContracts={readContracts}
          contractName={contractName}
          address={address}
          injectedProvider={injectedProvider}
          targetNetwork={targetNetwork}
          blockExplorer={blockExplorer}
          localProvider={localProvider}
          mainnetProvider={mainnetProvider}
          />
        </Route>
        <Route path="/pool">
          <Transactions
            address={address}
            mainnetProvider={mainnetProvider}
            localProvider={localProvider}
            price={price}
            tx={tx}
            writeContracts={writeContracts}
            readContracts={readContracts}
            poolServerUrl={poolServerUrl}
            contractName={contractName}
            signaturesRequired={signaturesRequired}
            nonce={nonce}
            userSigner={userSigner}
            blockExplorer={blockExplorer}
            gun={gun}
          />
        </Route>
        <Route path="/owners">
          <Owners
            mainnetProvider={mainnetProvider}
            address={address}
            blockExplorer={blockExplorer}
            contractName={contractName}
            readContracts={readContracts}
            ownerEvents={ownerEvents}
            signaturesRequired={signaturesRequired}
          />
        </Route>
        <Route path="/subgraph">
          <Subgraph
            subgraphUri={props.subgraphUri}
            tx={tx}
            writeContracts={writeContracts}
            mainnetProvider={mainnetProvider}
          />
        </Route>
      </Switch>

      <ThemeSwitch />

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
        <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
          {USE_NETWORK_SELECTOR && (
            <div style={{ marginRight: 20 }}>
              <NetworkSwitch
                networkOptions={networkOptions}
                selectedNetwork={selectedNetwork}
                setSelectedNetwork={setSelectedNetwork}
              />
            </div>
          )}
          <Account
            useBurner={USE_BURNER_WALLET}
            address={address}
            localProvider={localProvider}
            userSigner={userSigner}
            mainnetProvider={mainnetProvider}
            price={price}
            web3Modal={web3Modal}
            loadWeb3Modal={loadWeb3Modal}
            logoutOfWeb3Modal={logoutOfWeb3Modal}
            blockExplorer={blockExplorer}
          />
        </div>
        {yourLocalBalance.lte(ethers.BigNumber.from("0")) && (
          <FaucetHint localProvider={localProvider} targetNetwork={targetNetwork} address={address} />
        )}
      </div>

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
      <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
        <Row align="middle" gutter={[4, 4]}>
          <Col span={8}>
            <Ramp price={price} address={address} networks={NETWORKS} />
          </Col>

          <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
            <GasGauge gasPrice={gasPrice} />
          </Col>
          <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
            <Button
              onClick={() => {
                window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
              }}
              size="large"
              shape="round"
            >
              <span style={{ marginRight: 8 }} role="img" aria-label="support">
                💬
              </span>
              Support
            </Button>
          </Col>
        </Row>

        <Row align="middle" gutter={[4, 4]}>
          <Col span={24}>
            {
              /*  if the local provider has a signer, let's show the faucet:  */
              faucetAvailable ? (
                <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider} />
              ) : (
                ""
              )
            }
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default App;
