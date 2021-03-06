import React, { useState } from "react";
import { Button, List } from "antd";
import { Address, Balance, Blockie, TransactionDetailsModal } from "../components";
import { EllipsisOutlined } from "@ant-design/icons";
import { parseEther, formatEther } from "@ethersproject/units";
import ERC20 from "../contracts/ERC20.json";
const { ethers } = require("ethers");
//@TODO does not need to show value (or "to" but maybe thats ok) when adding or removing signers (i.e. value is 0)

const TransactionListItem = function ({item, mainnetProvider, blockExplorer, price, readContracts, contractName, children, localProvider}) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [txnInfo, setTxnInfo] = useState(null);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  let iface = new ethers.utils.Interface(ERC20.abi);

  console.log("🔥🔥🔥🔥", item)
  item = item.args ? item.args : item;

  let txnData;
  let customContract;
  let decimals;

  const handleDecimals = async () => {
    decimals = await customContract.functions.decimals();
  }

  if(item.data != "0x") {
    if (item.to === readContracts[contractName].address) {
      try {
        txnData = readContracts[contractName].interface.parseTransaction(item);
        console.log("txndata1:", txnData);
      } catch (error){
        console.log("ERROR", error)
      }
    } else {
      try {
        txnData = iface.parseTransaction(item);
        customContract = new ethers.Contract(item.to, ERC20.abi, localProvider);
        handleDecimals();
        console.log("txndata2:", txnData);
      } catch (error){
        txnData = {
          functionFragment: {
            name:"smart contract call",
            inputs: [
              {
                name: "contract",
                type: "address"
              },
              {
                name: "data",
                type: "string"
              },
              {
                name: "hash",
                type: "string"
              }
            ]
          },
          args: [
            item.to,
            item.data,
            item.hash
          ],
          signature: "unknown",
          sighash: item.data.substring(0,10)
        }
        console.log("ERROR", error)
    }
   }
  }



  return <>
    <TransactionDetailsModal
      visible={isModalVisible}
      txnInfo={txnData}
      item={item}
      handleOk={handleOk}
      mainnetProvider={mainnetProvider}
      price={price}
    />
    {<List.Item key={item.hash} style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 55,
          fontSize: 12,
          opacity: 0.5,
          display: "flex",
          flexDirection: "row",
          width: "90%",
          justifyContent: "space-between",
        }}
      >
        <p>
          <b>Event Name :&nbsp;</b>
          {txnData ? txnData.functionFragment.name : "Transfer ETH"}&nbsp;
        </p>
        <p>
          <b>Addressed to :&nbsp;</b>
          {txnData ? txnData.args[0] : item.to}
        </p>
      </div>
      {<b style={{ padding: 16 }}>#{typeof(item.nonce)=== "number" ? item.nonce : item.nonce.toNumber()}</b>}
      <span>
        <Blockie size={4} scale={8} address={item.hash} /> {item.hash.substr(0, 6)}
      </span>
      <Address address={item.to} ensProvider={mainnetProvider} blockExplorer={blockExplorer} fontSize={16} />

      {txnData ?
        txnData.functionFragment.name === "addSigner" ?
        <span
          style={{
            verticalAlign: "middle",
            fontSize: 24,
            padding: 8,
          }}
        >
          +signer
        </span> :
        txnData.functionFragment.name === "removeSigner" ?
        <span
          style={{
            verticalAlign: "middle",
            fontSize: 24,
            padding: 8,
          }}
        >
          -signer
        </span> :
        txnData.functionFragment.name === "approve" || txnData.functionFragment.name === "transfer" ?
        <span
          style={{
            verticalAlign: "middle",
            fontSize: 24,
            padding: 8,
            width: 95,
            overflow: "hidden"
          }}
        >
          { parseFloat(ethers.utils.formatUnits(txnData.args[1], decimals)) }
        </span> :
        <span
          style={{
            verticalAlign: "middle",
            fontSize: 24,
            padding: 8,
            width: 95,
          }}
        >

        </span>  :
        <Balance balance={item.value ? item.value : parseEther("" + parseFloat(item.amount).toFixed(12))} dollarMultiplier={price} />}
      <>
        {
          children
        }
      </>
      <Button
        onClick={showModal}
      >
        <EllipsisOutlined />
      </Button>

    </List.Item>}
    </>
};
export default TransactionListItem;
