import React, { useEffect } from "react";
import { Select, List, Spin, Collapse } from "antd";
import { Address } from "./";

const { Panel } = Collapse;

export default function Signers({
  ownerEvents,
  signaturesRequired,
  mainnetProvider,
  blockExplorer
}) {
  const owners = new Set();
  const prevOwners = new Set();
  ownerEvents.forEach((ownerEvent) => {
    if (ownerEvent.args.added) {
      owners.add(ownerEvent.args.owner);
      prevOwners.delete(ownerEvent.args.owner)
    } else {
      prevOwners.add(ownerEvent.args.owner)
      owners.delete(ownerEvent.args.owner);
    }
  });

  return (
    <div>
      <List
        header={<h2>Owners</h2>}
        style={{maxWidth:400, margin:"auto", marginTop:32}}
        bordered
        dataSource={[...owners]}
        renderItem={(ownerAddress) => {
          return (
            <List.Item key={"owner_" + ownerAddress}>
              <Address
                address={ownerAddress}
                ensProvider={mainnetProvider}
                blockExplorer={blockExplorer}
                fontSize={24}
              />
            </List.Item>
          )
        }}
      />

      <Collapse collapsible={prevOwners.size == 0 ? "disabled" : ""} style={{maxWidth:400, margin:"auto", marginTop:10}}>
        <Panel header="Previous Owners" key="1">
          <List
            dataSource={[...prevOwners]}
            renderItem={(prevOwnerAddress) => {
              return (
                <List.Item key={"owner_" + prevOwnerAddress}>
                  <Address
                    address={prevOwnerAddress}
                    ensProvider={mainnetProvider}
                    blockExplorer={blockExplorer}
                    fontSize={24}
                  />
                </List.Item>
              )
            }}
          />
        </Panel>
      </Collapse>
    </div>
  );
}
