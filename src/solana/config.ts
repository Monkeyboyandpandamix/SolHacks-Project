import { Idl, web3 } from '@coral-xyz/anchor';

export const SOLANA_RPC_ENDPOINT = 'https://api.devnet.solana.com';
export const SOLANA_EXPLORER_CLUSTER = 'devnet';
export const CIVIC_ACTIONS_PROGRAM_ID = new web3.PublicKey('7mLLxJS9dsoEGMdCZjx5tfxpGzera62zCYqRszBDuMPt');

export const CIVIC_ACTIONS_IDL: Idl = {
  address: CIVIC_ACTIONS_PROGRAM_ID.toBase58(),
  metadata: {
    name: 'civicActions',
    version: '0.1.0',
    spec: '0.1.0',
    description: 'Created with Anchor',
  },
  instructions: [
    {
      name: 'recordAction',
      discriminator: [153, 153, 235, 171, 52, 54, 196, 145],
      accounts: [
        {
          name: 'actionAccount',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [97, 99, 116, 105, 111, 110],
              },
              {
                kind: 'account',
                path: 'user',
              },
              {
                kind: 'arg',
                path: 'actionType',
              },
            ],
          },
        },
        {
          name: 'user',
          writable: true,
          signer: true,
        },
        {
          name: 'systemProgram',
          address: web3.SystemProgram.programId.toBase58(),
        },
      ],
      args: [
        {
          name: 'actionType',
          type: 'string',
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'civicAction',
      discriminator: [68, 136, 28, 26, 53, 23, 6, 57],
    },
  ],
  types: [
    {
      name: 'civicAction',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'user',
            type: 'pubkey',
          },
          {
            name: 'actionType',
            type: 'string',
          },
          {
            name: 'timestamp',
            type: 'i64',
          },
        ],
      },
    },
  ],
} as Idl;
