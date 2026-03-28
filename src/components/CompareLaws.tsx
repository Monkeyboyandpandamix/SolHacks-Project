import React, { useState, useEffect } from 'react';
import { Law } from '../types';
import { X, ArrowRight, Check, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { compareLawsWithAI } from '../services/geminiService';

interface CompareLawsProps {
  law1: Law;
  law2: Law;
  onClose: () => void;
}

const CompareLaws: React.FC<CompareLawsProps> = ({ law1, law2, onClose }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setIsLoading(true);
      try {
        const analysis = await compareLawsWithAI(law1, law2);
        setAiAnalysis(analysis);
      } catch (err) {
        console.error("Failed to fetch AI analysis", err);
        setAiAnalysis("Unable to generate comparative analysis at this time.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalysis();
  }, [law1, law2]);

  const diffs = [
    { label: 'Category', val1: law1.category, val2: law2.category },
    { label: 'Status', val1: law1.status, val2: law2.status },
    { label: 'Level', val1: law1.level, val2: law2.level },
    { label: 'Date', val1: law1.date, val2: law2.date },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/40 p-6 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative h-full max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[40px] bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/80 px-10 py-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <Sparkles size={24} />
            </div>
            <h2 className="text-3xl font-black tracking-tighter text-indigo-950">Compare Legislation</h2>
          </div>
          <button 
            onClick={onClose}
            className="rounded-2xl bg-slate-100 p-3 text-slate-400 transition-all hover:bg-rose-100 hover:text-rose-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="h-[calc(90vh-88px)] overflow-y-auto p-10 custom-scrollbar">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            {/* Law 1 Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-1.5 w-12 rounded-full bg-indigo-600" />
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{law1.category}</p>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-indigo-950">{law1.title}</h3>
            </div>

            {/* Law 2 Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-1.5 w-12 rounded-full bg-amber-500" />
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{law2.category}</p>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-indigo-950">{law2.title}</h3>
            </div>

            {/* Comparison Table */}
            <div className="md:col-span-2 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Key Differences</h4>
              <div className="rounded-[32px] border-2 border-slate-50 bg-slate-50/30 p-2">
                {diffs.map((diff, idx) => (
                  <div key={idx} className={`grid grid-cols-2 gap-8 p-6 ${idx !== diffs.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{diff.label}</p>
                      <p className={`text-sm font-bold ${diff.val1 !== diff.val2 ? 'text-indigo-600' : 'text-slate-600'}`}>{diff.val1}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{diff.label}</p>
                      <p className={`text-sm font-bold ${diff.val1 !== diff.val2 ? 'text-amber-600' : 'text-slate-600'}`}>{diff.val2}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Analysis */}
            <div className="md:col-span-2">
              <div className="rounded-[40px] bg-indigo-950 p-10 text-white shadow-2xl shadow-indigo-200">
                <h4 className="mb-6 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-indigo-300">
                  <Sparkles size={20} />
                  AI Comparative Analysis
                </h4>
                {isLoading ? (
                  <div className="flex items-center gap-3 text-indigo-300">
                    <Loader2 className="animate-spin" size={20} />
                    <span className="text-sm font-bold">Analyzing legislative impact...</span>
                  </div>
                ) : (
                  <p className="text-lg font-bold leading-relaxed text-indigo-100">
                    {aiAnalysis}
                  </p>
                )}
              </div>
            </div>

            {/* Summary Comparison */}
            <div className="space-y-6">
              <div className="rounded-[32px] bg-indigo-50 p-8 border-2 border-indigo-100">
                <h4 className="mb-4 flex items-center gap-3 text-xs font-black text-indigo-600 uppercase tracking-widest">
                  <Check size={18} />
                  Summary 1
                </h4>
                <p className="text-sm font-bold leading-relaxed text-indigo-900">{law1.simplifiedSummary}</p>
              </div>
              <div className="rounded-[32px] bg-indigo-50 p-8 border-2 border-indigo-100">
                <h4 className="mb-4 flex items-center gap-3 text-xs font-black text-indigo-600 uppercase tracking-widest">
                  <AlertCircle size={18} />
                  Impact 1
                </h4>
                <p className="text-sm font-bold leading-relaxed text-indigo-900">{law1.impact}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[32px] bg-amber-50 p-8 border-2 border-amber-100">
                <h4 className="mb-4 flex items-center gap-3 text-xs font-black text-amber-600 uppercase tracking-widest">
                  <Check size={18} />
                  Summary 2
                </h4>
                <p className="text-sm font-bold leading-relaxed text-amber-900">{law2.simplifiedSummary}</p>
              </div>
              <div className="rounded-[32px] bg-amber-50 p-8 border-2 border-amber-100">
                <h4 className="mb-4 flex items-center gap-3 text-xs font-black text-amber-600 uppercase tracking-widest">
                  <AlertCircle size={18} />
                  Impact 2
                </h4>
                <p className="text-sm font-bold leading-relaxed text-amber-900">{law2.impact}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CompareLaws;
