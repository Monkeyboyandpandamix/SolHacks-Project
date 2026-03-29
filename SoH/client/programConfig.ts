import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export const CIVIC_ACTIONS_PROGRAM_ID = new PublicKey(
  "7mLLxJS9dsoEGMdCZjx5tfxpGzera62zCYqRszBDuMPt"
);

export const CIVIC_ACTIONS_IDL = {
  address: CIVIC_ACTIONS_PROGRAM_ID.toBase58(),
  metadata: {
    name: "civic_actions",
    version: "0.1.0",
    spec: "0.1.0",
  },
  instructions: [
    {
      name: "recordAction",
      discriminator: [143, 173, 122, 191, 156, 155, 87, 196],
      accounts: [
        {
          name: "actionAccount",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [97, 99, 116, 105, 111, 110] },
              { kind: "account", path: "user" },
              { kind: "arg", path: "actionType" },
            ],
          },
        },
        {
          name: "user",
          writable: true,
          signer: true,
        },
        {
          name: "systemProgram",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "actionType",
          type: "string",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "civicAction",
      discriminator: [122, 152, 210, 252, 236, 206, 133, 181],
    },
  ],
  types: [
    {
      name: "civicAction",
      type: {
        kind: "struct",
        fields: [
          {
            name: "user",
            type: "pubkey",
          },
          {
            name: "actionType",
            type: "string",
          },
          {
            name: "timestamp",
            type: "i64",
          },
        ],
      },
    },
  ],
} as const;

export function getCivicActionsProgram(provider: anchor.AnchorProvider) {
  return new anchor.Program(
    CIVIC_ACTIONS_IDL as anchor.Idl,
    provider
  );
}
