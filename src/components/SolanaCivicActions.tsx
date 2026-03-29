import React from 'react';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Buffer } from 'buffer';
import {
  CheckCircle2,
  Coins,
  ExternalLink,
  HandCoins,
  RefreshCcw,
  ShieldCheck,
  Wallet,
  Zap,
} from 'lucide-react';
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

type CivicActionAccount = {
  publicKey: web3.PublicKey;
  account: {
    user: web3.PublicKey;
    actionType: string;
    timestamp: unknown;
  };
};

type CivicActionRecord = {
  address: string;
  actionType: string;
  actionLabel: string;
  timestamp: number | null;
};

function getProgram(wallet: ReturnType<typeof useWallet>, connection: web3.Connection) {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    return null;
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

  return new Program(CIVIC_ACTIONS_IDL, CIVIC_ACTIONS_PROGRAM_ID, provider);
}

function normalizeActionLabel(actionType: string) {
  const action = ACTIONS.find(({ id }) => actionType.startsWith(id));
  return action?.label ?? actionType.replaceAll('_', ' ');
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === 'number') {
    return value * 1000;
  }

  if (typeof value === 'bigint') {
    return Number(value) * 1000;
  }

  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber() * 1000;
  }

  return null;
}

async function confirmSignature(connection: web3.Connection, signature: string) {
  const latestBlockhash = await connection.getLatestBlockhash('confirmed');
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    'confirmed',
  );
}

const SolanaCivicActions: React.FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isAirdropping, setIsAirdropping] = React.useState(false);
  const [lastSignature, setLastSignature] = React.useState<string | null>(null);
  const [lastActionType, setLastActionType] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [balance, setBalance] = React.useState<number | null>(null);
  const [recentActions, setRecentActions] = React.useState<CivicActionRecord[]>([]);

  const refreshWalletState = React.useCallback(async () => {
    if (!wallet.publicKey) {
      setBalance(null);
      setRecentActions([]);
      return;
    }

    const program = getProgram(wallet, connection);

    if (!program) {
      setError('Connect a Solana wallet that supports transaction signing first.');
      return;
    }

    setIsRefreshing(true);
    setError(null);
    setStatusMessage(null);

    try {
      const [lamports, accountResults] = await Promise.all([
        connection.getBalance(wallet.publicKey, 'confirmed'),
        program.account.civicAction.all([
          {
            memcmp: {
              offset: 8,
              bytes: wallet.publicKey.toBase58(),
            },
          },
        ]) as Promise<CivicActionAccount[]>,
      ]);

      const normalizedActions = accountResults
        .map(({ publicKey, account }) => ({
          address: publicKey.toBase58(),
          actionType: account.actionType,
          actionLabel: normalizeActionLabel(account.actionType),
          timestamp: normalizeTimestamp(account.timestamp),
        }))
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0));

      setBalance(lamports / web3.LAMPORTS_PER_SOL);
      setRecentActions(normalizedActions);
    } catch (refreshError) {
      console.error(refreshError);
      setError('Unable to refresh Solana wallet details right now. Confirm the wallet is on devnet and the program is deployed.');
    } finally {
      setIsRefreshing(false);
    }
  }, [connection, wallet]);

  React.useEffect(() => {
    void refreshWalletState();
  }, [refreshWalletState]);

  const requestDevnetAirdrop = React.useCallback(async () => {
    if (!wallet.publicKey) {
      throw new Error('No wallet connected');
    }

    const attempts = [
      0.25 * web3.LAMPORTS_PER_SOL,
      0.1 * web3.LAMPORTS_PER_SOL,
    ];

    let lastError: unknown;

    for (const lamports of attempts) {
      try {
        const signature = await connection.requestAirdrop(wallet.publicKey, lamports);
        await confirmSignature(connection, signature);
        return lamports / web3.LAMPORTS_PER_SOL;
      } catch (attemptError) {
        lastError = attemptError;
      }
    }

    throw lastError ?? new Error('Airdrop failed');
  }, [connection, wallet.publicKey]);

  const handleAirdrop = async () => {
    if (!wallet.publicKey) {
      setError('Connect a Solana wallet before requesting devnet SOL.');
      return;
    }

    setIsAirdropping(true);
    setError(null);
    setStatusMessage('Requesting devnet SOL for the connected wallet...');

    try {
      const receivedSol = await requestDevnetAirdrop();
      await refreshWalletState();
      setStatusMessage(`${receivedSol.toFixed(2)} devnet SOL received. You can now record a civic action.`);
    } catch (airdropError) {
      console.error(airdropError);
      setError(`Devnet airdrop failed because the public faucet is rate-limiting requests. Try again later or fund this wallet manually with 'solana airdrop 2 ${wallet.publicKey.toBase58()} --url https://api.devnet.solana.com'.`);
      setStatusMessage(null);
    } finally {
      setIsAirdropping(false);
    }
  };

  const handleRecordAction = async (baseActionType: string) => {
    if (!wallet.publicKey) {
      setError('Connect a Solana wallet that supports transaction signing first.');
      return;
    }

    const program = getProgram(wallet, connection);

    if (!program) {
      setError('Connect a Solana wallet that supports transaction signing first.');
      return;
    }

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
    setStatusMessage('Preparing the Solana transaction...');
    setLastSignature(null);

    try {
      const lamports = await connection.getBalance(wallet.publicKey, 'confirmed');

      if (lamports < 0.01 * web3.LAMPORTS_PER_SOL) {
        setStatusMessage('Your wallet is low on devnet SOL. Requesting an airdrop before recording the action...');
        await requestDevnetAirdrop();
        await refreshWalletState();
      }

      setStatusMessage('Submitting the civic action to Solana devnet...');
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
      await refreshWalletState();
      setStatusMessage('Civic action recorded successfully on Solana devnet.');
    } catch (recordError) {
      console.error(recordError);
      setError(`Failed to record the civic action on Solana. Confirm the wallet is on devnet, funded, and the SoH program is deployed. If faucet retries keep failing, run 'solana airdrop 2 ${wallet.publicKey.toBase58()} --url https://api.devnet.solana.com' in your terminal first.`);
      setStatusMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canRecordAction = Boolean(wallet.publicKey) && !isSubmitting && !isAirdropping;

  return (
    <section className="rounded-[40px] bg-white p-10 shadow-xl shadow-slate-200/50">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
          <Wallet size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-black tracking-tight text-indigo-950">On-Chain Civic Actions</h3>
          <p className="font-bold text-slate-400 text-sm">
            Connect a Solana wallet, fund it on devnet, and record verifiable civic participation receipts through the `SoH` Anchor program.
          </p>
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-100 bg-slate-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Wallet Connection</p>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Use Phantom or Solflare on devnet to sign transactions and record civic actions on-chain.
            </p>
          </div>
          <WalletMultiButton className="!rounded-2xl !bg-indigo-600 !px-5 !py-3 !text-xs !font-black !shadow-xl !shadow-indigo-100" />
        </div>

        {wallet.publicKey && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
              Connected wallet: {wallet.publicKey.toBase58()}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 text-indigo-600">
                  <Coins size={18} />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Devnet Balance</p>
                </div>
                <p className="mt-3 text-2xl font-black tracking-tight text-indigo-950">
                  {balance === null ? '--' : balance.toFixed(3)} SOL
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 text-indigo-600">
                  <ShieldCheck size={18} />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Program</p>
                </div>
                <p className="mt-3 text-sm font-black text-indigo-950">Civic Actions / Devnet</p>
                <p className="mt-2 break-all text-xs font-bold text-slate-500">
                  {CIVIC_ACTIONS_PROGRAM_ID.toBase58()}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 text-indigo-600">
                  <Zap size={18} />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recorded Actions</p>
                </div>
                <p className="mt-3 text-2xl font-black tracking-tight text-indigo-950">{recentActions.length}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAirdrop}
                disabled={isAirdropping}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-100 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <HandCoins size={16} />
                {isAirdropping ? 'Requesting Devnet SOL...' : 'Request 1 SOL Airdrop'}
              </button>

              <button
                onClick={() => void refreshWalletState()}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCcw size={16} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Wallet State'}
              </button>
            </div>

            {balance !== null && balance < 0.01 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                This wallet is low on devnet SOL. The action buttons will try to request test SOL automatically before submitting.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleRecordAction(action.id)}
            disabled={!canRecordAction}
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

      {statusMessage && (
        <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-800">
          {statusMessage}
        </div>
      )}

      {lastSignature && (
        <div className="mt-6 rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-black text-emerald-800">
                Recorded `{normalizeActionLabel(lastActionType ?? '')}` on Solana devnet.
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

      <div className="mt-8 rounded-[32px] border border-slate-100 bg-slate-50 p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">On-Chain History</p>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Recent civic actions already recorded by this connected wallet.
            </p>
          </div>
          {wallet.publicKey && (
            <button
              onClick={() => void refreshWalletState()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCcw size={14} />
              Refresh
            </button>
          )}
        </div>

        {!wallet.publicKey && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-bold text-slate-400">
            Connect a wallet to load its civic action history.
          </div>
        )}

        {wallet.publicKey && recentActions.length === 0 && !isRefreshing && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-bold text-slate-400">
            No on-chain civic actions recorded yet for this wallet.
          </div>
        )}

        {recentActions.length > 0 && (
          <div className="space-y-3">
            {recentActions.map((action) => (
              <div
                key={action.address}
                className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white px-5 py-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-black text-indigo-950">{action.actionLabel}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {action.timestamp ? new Date(action.timestamp).toLocaleString() : 'Timestamp unavailable'}
                  </p>
                </div>
                <a
                  href={`https://explorer.solana.com/address/${action.address}?cluster=${SOLANA_EXPLORER_CLUSTER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-700 hover:text-indigo-900"
                >
                  View account
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SolanaCivicActions;
