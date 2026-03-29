import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

describe("civic_actions", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CivicActions as anchor.Program<any>;

  it("Records a civic action using PDA", async () => {
    // Use a unique action type so PDA init works every test run
    const actionType = "signed_petition_" + Date.now();

    // Compute the PDA
    const [actionAccountPDA] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("action"),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(actionType),
      ],
      program.programId
    );

    // Call the program
    const tx = await program.methods
      .recordAction(actionType)
      .accounts({
        actionAccount: actionAccountPDA,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Fetch the account
    const account = await program.account.civicAction.fetch(actionAccountPDA);
    console.log("Stored action:", account);
  });
});
