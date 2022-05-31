import React from "react";
import { useHistory } from "react-router-dom";
import { Select, Button, List, Input, Spin, Row, Col } from "antd";
import { Address, AddressInput, Balance, Blockie, Signers } from "../components";
import { useLocalStorage } from "../hooks";

const { Option } = Select;

export default function Owners({contractName, ownerEvents, signaturesRequired, address, mainnetProvider, readContracts, blockExplorer }) {

  const history = useHistory();

  const [to, setTo] = useLocalStorage("to");
  const [amount, setAmount] = useLocalStorage("amount","0");
  const [methodName, setMethodName] = useLocalStorage("addSigner");
  const [newOwner, setNewOwner] = useLocalStorage("newOwner");
  const [newSignaturesRequired, setNewSignaturesRequired] = useLocalStorage("newSignaturesRequired");
  const [data, setData] = useLocalStorage("data","0x");
console.log("ownerArgs:", ownerEvents)
//@TODO when the create button is clicked, this can skip the create page and go straight to transactions

  return (
    <div>
      <h2 style={{marginTop:32}}>Signatures Required: {signaturesRequired ? signaturesRequired.toNumber() :<Spin></Spin>}</h2>
      <Row>
        <Col xs={{ span: 24 }} lg={{ span: 12, offset: 3 }}>
          <Signers
              ownerEvents={ownerEvents}
              signaturesRequired={signaturesRequired}
              mainnetProvider={mainnetProvider}
              blockExplorer={blockExplorer}
            />
          </Col>
          <Col  lg={6} xs={24}>
            <div style={{border:"1px solid gray", borderRadius: "4px", padding:16, width:400, margin:"auto",marginTop:32}}>
              <div style={{margin:8,padding:8}}>
                <Select value={methodName} style={{ width: "100%" }} onChange={ setMethodName }>
                  <Option key="addSigner">addSigner()</Option>
                  <Option key="removeSigner">removeSigner()</Option>
                </Select>
              </div>
              <div style={{margin:8,padding:8}}>
                <AddressInput
                  autoFocus
                  ensProvider={mainnetProvider}
                  placeholder="new owner address"
                  value={newOwner}
                  onChange={setNewOwner}
                />
              </div>
              <div style={{margin:8,padding:8}}>
                <Input
                  ensProvider={mainnetProvider}
                  placeholder="new # of signatures required"
                  value={newSignaturesRequired}
                  onChange={(e)=>{setNewSignaturesRequired(e.target.value)}}
                />
              </div>
              <div style={{margin:8,padding:8}}>
                <Button onClick={()=>{
                  console.log("METHOD",setMethodName)
                  let calldata = readContracts[contractName].interface.encodeFunctionData(methodName,[newOwner,newSignaturesRequired])
                  console.log("calldata",calldata)
                  setData(calldata)
                  setAmount("0")
                  setTo(readContracts[contractName].address)
                  setTimeout(()=>{
                    history.push('/create')
                  },777)
                }}>
                Create Tx
                </Button>
              </div>
            </div>
          </Col>
      </Row>
    </div>
  );
}
