import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { CivicActions } from "../../target/types/civic_actions"; // adjust path if needed
import { PublicKey, SystemProgram } from "@solana/web3.js";import type { CivicActions } from "../target/types/civic_actions";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.CivicActions as anchor.Program<CivicActions>;



export const getProgram = (provider: anchor.AnchorProvider) => {
  return new anchor.Program<CivicActions>(
    CivicActions,
    new PublicKey("YOUR_PROGRAM_ID_HERE"), // replace with your deployed program ID
    provider
  );
};

// Helper to compute PDA
export const getActionPDA = async (
  userPubkey: PublicKey,
  actionType: string
) => {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from("action"), userPubkey.toBuffer(), Buffer.from(actionType)],
    new PublicKey("7mLLxJS9dsoEGMdCZjx5tfxpGzera62zCYqRszBDuMPt") // replace with your deployed program ID
  );
  return pda;
};
