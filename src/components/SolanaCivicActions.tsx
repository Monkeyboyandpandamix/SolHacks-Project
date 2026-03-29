import React from 'react';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { CheckCircle2, ExternalLink, Wallet, Zap } from 'lucide-react';
import {
  CIVIC_ACTIONS_IDL,
  CIVIC_ACTIONS_PROGRAM_ID,
  SOLANA_EXPLORER_CLUSTER,
} from '../solana/config';

const ACTIONS = [
  {
    id: 'signed_petition',
    label: 'Record Petition Support',
    description: 'Write a wallet-signed proof that you supported a civic issue or petition.',
  },
  {
    id: 'advocacy_action',
    label: 'Record Advocacy Action',
    description: 'Store proof that you completed an advocacy or outreach action.',
  },
  {
    id: 'community_participation',
    label: 'Record Community Participation',
    description: 'Create an on-chain participation receipt for a public-interest or community action.',
  },
] as const;

const SolanaCivicActions: React.FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lastSignature, setLastSignature] = React.useState<string | null>(null);
  const [lastActionType, setLastActionType] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleRecordAction = async (baseActionType: string) => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      setError('Connect a Solana wallet that supports transaction signing first.');
      return;
    }

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      },
      { commitment: 'confirmed' },
    );

    const program = new Program(CIVIC_ACTIONS_IDL, CIVIC_ACTIONS_PROGRAM_ID, provider);
    const actionType = `${baseActionType}_${Date.now()}`;
    const [actionAccountPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('action'),
        wallet.publicKey.toBuffer(),
        Buffer.from(actionType),
      ],
      CIVIC_ACTIONS_PROGRAM_ID,
    );

    setIsSubmitting(true);
    setError(null);
    setLastSignature(null);

    try {
      const signature = await program.methods
        .recordAction(actionType)
        .accounts({
          actionAccount: actionAccountPda,
          user: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      setLastSignature(signature);
      setLastActionType(baseActionType);
    } catch (recordError) {
      console.error(recordError);
      setError('Failed to record the civic action on Solana. Confirm the wallet is on devnet and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-[40px] bg-white p-10 shadow-xl shadow-slate-200/50">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
          <Wallet size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-black tracking-tight text-indigo-950">On-Chain Civic Actions</h3>
          <p className="font-bold text-slate-400 text-sm">
            Connect a Solana wallet and write a verifiable civic action receipt to the `SoH` Anchor program on devnet.
          </p>
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-100 bg-slate-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Wallet Connection</p>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Use Phantom or Solflare on devnet to sign and submit the civic action transaction.
            </p>
          </div>
          <WalletMultiButton className="!rounded-2xl !bg-indigo-600 !px-5 !py-3 !text-xs !font-black !shadow-xl !shadow-indigo-100" />
        </div>

        {wallet.publicKey && (
          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
            Connected wallet: {wallet.publicKey.toBase58()}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleRecordAction(action.id)}
            disabled={isSubmitting}
            className="flex items-start justify-between gap-4 rounded-[28px] border border-slate-100 bg-white px-6 py-5 text-left shadow-sm transition hover:border-indigo-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <div>
              <p className="text-sm font-black text-indigo-950">{action.label}</p>
              <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">{action.description}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Zap size={18} />
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {lastSignature && (
        <div className="mt-6 rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-black text-emerald-800">
                Recorded `{lastActionType}` on Solana devnet.
              </p>
              <a
                href={`https://explorer.solana.com/tx/${lastSignature}?cluster=${SOLANA_EXPLORER_CLUSTER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-900"
              >
                View transaction
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SolanaCivicActions;
