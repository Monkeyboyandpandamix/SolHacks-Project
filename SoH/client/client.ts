import * as anchor from "@coral-xyz/anchor";
import * as web3 from "@solana/web3.js";
import { getCivicActionsProgram } from "./programConfig";

async function main() {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = getCivicActionsProgram(provider);

  console.log("Provider wallet:", program.provider.publicKey.toString());
  console.log("Program ID:", program.programId.toString());
  console.log("Cluster RPC:", program.provider.connection.rpcEndpoint);

  const balance = await program.provider.connection.getBalance(program.provider.publicKey);
  console.log(`Wallet balance: ${balance / web3.LAMPORTS_PER_SOL} SOL`);
}

void main();
