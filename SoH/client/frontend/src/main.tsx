import * as anchor from "@coral-xyz/anchor";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";import type { CivicActions } from "../target/types/civic_actions";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.CivicActions as anchor.Program<CivicActions>;



const wallets = [new PhantomWalletAdapter()];

const network = "https://api.devnet.solana.com"; // or your Playground endpoint

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ConnectionProvider endpoint={network}>
    <WalletProvider wallets={wallets} autoConnect>
      <App />
    </WalletProvider>
  </ConnectionProvider>
);