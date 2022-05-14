import React from "react";
import { Modal } from "antd";
import Address from "./Address";
import Balance from "./Balance";
import { parseEther, formatEther } from "@ethersproject/units";

const TransactionDetailsModal = function ({visible, handleOk, mainnetProvider, price, item, txnInfo = null}) {
  return (
    <Modal
      title="Transaction Details"
      visible={visible}
      onCancel={handleOk}
      destroyOnClose
      onOk={handleOk}
      footer={null}
      closable
      maskClosable
    >
      {txnInfo ? (
        <div>
          <p>
            <b>Event Name :</b> {txnInfo.functionFragment.name}
          </p>
          <p>
            <b>Function Signature :</b> {txnInfo.signature}
          </p>
          <h4>Arguments :&nbsp;</h4>
          {console.log("InputsAAA:", txnInfo.functionFragment.inputs)}
          {txnInfo.functionFragment.inputs.map((element, index) => {
            if (element.type === "address") {
              console.log("inputs2",txnInfo.args[index]);
              return (
                <div key={element.name} style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "left" }}>
                  <b>{element.name} :&nbsp;</b>
                  <Address fontSize={16} address={txnInfo.args[index]} ensProvider={mainnetProvider} />
                </div>
              );
            }
              return (
                <p key={element.name}>
                  { element.name === "value" ?
                  <><b>{element.name} : </b> <Balance fontSize={16} balance={txnInfo.args[index]} dollarMultiplier={price} /> </>
                  : element.name === "_value" ?
                  <><b>{element.name} : </b> {txnInfo.args[index] && formatEther(txnInfo.args[index])} </>
                  : element.name === "data" || element.name === "hash" ?
                  <><b>{element.name} : </b> {txnInfo.args[index]} </>
                  : <><b>{element.name} : </b> {txnInfo.args[index] &&  txnInfo.args[index].toNumber()}</>}
                </p>
              );
            }
          )}
          <p>
            <b>SigHash : &nbsp;</b>
            {txnInfo.sighash}
          </p>
        </div>
      )
      :
        <div>
          <p>
            <b>Event Name:</b> Transfering ETH
          </p>

          <h4>Arguments :&nbsp;</h4>
          <div key="Address" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "left" }}>
            <b>To: &nbsp;</b>
            <Address fontSize={16} address={item.to} ensProvider={mainnetProvider} />
          </div>
          <div>
            <b>Amount: &nbsp;</b>
            <Balance balance={item.value ? item.value : parseEther("" + parseFloat(item.amount).toFixed(12))} dollarMultiplier={price} />
          </div>
          <p>
            <b>SigHash: &nbsp;</b>
            {txnInfo ? txnInfo.sighash : item.hash}
          </p>
        </div>
      }
    </Modal>
  );
};

export default TransactionDetailsModal;
