import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import LawCard from './LawCard';
import { BookmarkCollection, Law } from '../types';

interface LawFeedProps {
  laws: Law[];
  allLaws?: Law[];
  isLoading: boolean;
  error: string | null;
  highlightedLawId?: string | null;
  onSave: (id: string) => void;
  onVote: (id: string, type: 'support' | 'oppose') => void;
  onComment: (id: string, text: string) => void;
  onPollVote: (id: string, optionLabel: string) => void;
  onAddImpactStory?: (id: string, text: string) => void;
  onSaveToCollection?: (id: string, collectionId: string) => void;
  collections?: BookmarkCollection[];
  onCompare?: (law: Law) => void;
  comparingIds?: string[];
  onToggleFollowTopic?: (topic: string) => void;
  followedTopics?: string[];
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const SkeletonCard = () => (
  <div className="mb-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
    <div className="mb-6 flex items-center justify-between">
      <div className="h-8 w-32 rounded-2xl bg-slate-100" />
      <div className="h-8 w-24 rounded-2xl bg-slate-100" />
    </div>
    <div className="mb-4 h-1.5 w-12 rounded-full bg-slate-100" />
    <div className="mb-6 h-10 w-3/4 rounded-2xl bg-slate-100" />
    <div className="h-32 w-full rounded-[32px] bg-slate-50" />
  </div>
);

const LawFeed: React.FC<LawFeedProps> = ({
  laws,
  allLaws = laws,
  isLoading,
  error,
  highlightedLawId,
  onSave,
  onVote,
  onComment,
  onPollVote,
  onAddImpactStory,
  onSaveToCollection,
  collections = [],
  onCompare,
  comparingIds = [],
  onToggleFollowTopic,
  followedTopics = [],
  totalCount,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) => {
  const [loadingStep, setLoadingStep] = React.useState(0);
  const steps = [
    'Establishing secure connection to federal archives...',
    'Querying state legislative databases...',
    'Scanning local municipal ordinances...',
    'Simplifying legal jargon with AI...',
    'Finalizing your personalized civic feed...',
  ];

  React.useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => setLoadingStep((prev) => (prev + 1) % steps.length), 1500);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="space-y-10">
        <div className="flex flex-col items-center justify-center gap-8 rounded-[40px] border-2 border-slate-50 bg-white p-12 text-center shadow-xl shadow-slate-200/50">
          <div className="relative">
            <Loader2 size={80} className="animate-spin text-indigo-600 opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="h-10 w-10 rounded-full bg-indigo-600 shadow-2xl shadow-indigo-400"
              />
            </div>
          </div>
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-2xl font-black tracking-tight text-indigo-950"
              >
                {steps[loadingStep]}
              </motion.p>
            </AnimatePresence>
            <div className="mx-auto h-1.5 w-64 overflow-hidden rounded-full bg-slate-100">
              <motion.div animate={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }} className="h-full bg-indigo-600" />
            </div>
          </div>
        </div>
        <div className="space-y-6 opacity-40 grayscale">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-4 text-red-500">
        <AlertCircle size={40} />
        <p className="text-lg font-medium">{error}</p>
      </div>
    );
  }

  if (laws.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-4 text-slate-400">
        <AlertCircle size={40} />
        <p className="text-lg font-medium">No laws found for this location.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">Legislative feed</h2>
        <span className="text-sm text-slate-500">{totalCount ?? laws.length} laws found</span>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        {laws.map((law) => (
          <LawCard
            key={law.id}
            law={law}
            onSave={onSave}
            onVote={onVote}
            onComment={onComment}
            onPollVote={onPollVote}
            onAddImpactStory={onAddImpactStory}
            onSaveToCollection={onSaveToCollection}
            collections={collections}
            onCompare={onCompare}
            isComparing={comparingIds.includes(law.id)}
            onToggleFollowTopic={onToggleFollowTopic}
            isFollowingTopic={followedTopics.includes(law.category)}
            isHighlighted={highlightedLawId === law.id}
            relatedLaws={allLaws.filter((candidate) => (law.relatedLawIds || []).includes(candidate.id))}
          />
        ))}
      </motion.div>
      {onPageChange && totalPages > 1 && (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[32px] border-2 border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/30">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-500 transition-all hover:border-indigo-600 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
            PREVIOUS
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`h-11 min-w-11 rounded-2xl px-4 text-xs font-black transition-all ${page === currentPage ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-600 hover:text-indigo-600'}`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-500 transition-all hover:border-indigo-600 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            NEXT
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default LawFeed;
