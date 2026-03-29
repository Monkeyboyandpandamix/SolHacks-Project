import * as anchor from "@coral-xyz/anchor";
import React, { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getActionPDA, getProgram } from "./programClient";

export default function App() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [status, setStatus] = useState<string>("");

  const recordCivicAction = async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      setStatus("Connect a wallet that supports signing first.");
      return;
    }

    try {
      setStatus("Processing transaction...");

      const provider = new anchor.AnchorProvider(
        connection,
        {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        },
        { commitment: "confirmed" }
      );

      const program = getProgram(provider);
      const actionType = `signed_petition_${Date.now()}`;
      const actionPDA = await getActionPDA(wallet.publicKey, actionType);

      const signature = await program.methods
        .recordAction(actionType)
        .accounts({
          actionAccount: actionPDA,
          user: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      setStatus(`Action recorded: ${signature}`);
    } catch (error) {
      console.error(error);
      setStatus("Failed to record action.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Civic Actions Demo</h1>
      <WalletMultiButton />

      {wallet.connected && (
        <>
          <p>Connected wallet: {wallet.publicKey?.toBase58()}</p>
          <button onClick={recordCivicAction}>Record Civic Action</button>
          <p>{status}</p>
        </>
      )}
    </div>
  );
}
