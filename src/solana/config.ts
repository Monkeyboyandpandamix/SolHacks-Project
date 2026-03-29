import { Idl, web3 } from '@coral-xyz/anchor';

export const SOLANA_RPC_ENDPOINT = 'https://api.devnet.solana.com';
export const SOLANA_EXPLORER_CLUSTER = 'devnet';
export const CIVIC_ACTIONS_PROGRAM_ID = new web3.PublicKey('7mLLxJS9dsoEGMdCZjx5tfxpGzera62zCYqRszBDuMPt');

export const CIVIC_ACTIONS_IDL: Idl = {
  version: '0.1.0',
  name: 'civic_actions',
  instructions: [
    {
      name: 'recordAction',
      accounts: [
        { name: 'actionAccount', isMut: true, isSigner: false },
        { name: 'user', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
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
      type: {
        kind: 'struct',
        fields: [
          { name: 'user', type: 'publicKey' },
          { name: 'actionType', type: 'string' },
          { name: 'timestamp', type: 'i64' },
        ],
      },
    },
  ],
  metadata: {
    address: CIVIC_ACTIONS_PROGRAM_ID.toBase58(),
  },
} as Idl;
