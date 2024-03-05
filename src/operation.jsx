import React, { FC } from "react";

import { ExecuteTransaction } from "./execute";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletMultiButton } from "@demox-labs/aleo-wallet-adapter-reactui";

export const Wallet = () => {
  const { publicKey, wallet, disconnect } = useWallet();
  return (
    <>
      <div className="header">
        <p>Address: {publicKey ? publicKey : "Not Connected"}</p>
        <WalletMultiButton startIcon={undefined} className="multibutton">
          {publicKey ? "Disconnect" : "Connect wallet"}
        </WalletMultiButton>
      </div>
      <div className="walletcontainer">
        <ExecuteTransaction />
      </div>
    </>
  );
};
