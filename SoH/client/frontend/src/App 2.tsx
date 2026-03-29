import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import React, { useState } from "react";
import { WalletMultiButton, useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { getProgram, getActionPDA } from "./programClient";import type { CivicActions } from "../target/types/civic_actions";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.CivicActions as anchor.Program<CivicActions>;



export default function App() {
  const wallet = useWallet();
  const [status, setStatus] = useState<string>("");

  const recordCivicAction = async () => {
    if (!wallet.connected || !wallet.publicKey) return;

    try {
      setStatus("Processing transaction...");

      // Create provider
      const provider = new anchor.AnchorProvider(
        (wallet as any).connection,
        wallet as any,
        {}
      );

      const program = getProgram(provider);

      // Example action type
      const actionType = "signed_petition_" + Date.now();

      // Compute PDA
      const actionPDA = await getActionPDA(wallet.publicKey, actionType);

      // Send transaction
      const tx = await program.methods
        .recordAction(actionType)
        .accounts({
          actionAccount: actionPDA,
          user: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      setStatus(`Action recorded! Transaction: ${tx}`);
    } catch (err) {
      console.error(err);
      setStatus("Failed to record action");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
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