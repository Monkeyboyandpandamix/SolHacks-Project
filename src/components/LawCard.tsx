import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bookmark, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, CheckCircle, Clock, AlertTriangle, XCircle, Globe, Map as MapIcon, Building2, Landmark, MessageSquare, Send, BarChart3, Sparkles, BookOpen, Mail, Copy, Check, Volume2, ShieldAlert, CalendarDays, Users } from 'lucide-react';
import { BookmarkCollection, Law } from '../types';
import { generateAdvocacyLetter } from '../services/geminiService';

interface LawCardProps {
  law: Law;
  onSave: (id: string) => void;
  onVote: (id: string, type: 'support' | 'oppose') => void;
  onComment: (id: string, text: string) => void;
  onPollVote: (id: string, optionLabel: string) => void;
  onAddImpactStory?: (id: string, text: string) => void;
  onSaveToCollection?: (id: string, collectionId: string) => void;
  collections?: BookmarkCollection[];
  onCompare?: (law: Law) => void;
  isComparing?: boolean;
  isHighlighted?: boolean;
  onToggleFollowTopic?: (topic: string) => void;
  isFollowingTopic?: boolean;
  relatedLaws?: Law[];
}

const LawCard: React.FC<LawCardProps> = ({
  law,
  onSave,
  onVote,
  onComment,
  onPollVote,
  onAddImpactStory,
  onSaveToCollection,
  collections = [],
  onCompare,
  isComparing,
  isHighlighted,
  onToggleFollowTopic,
  isFollowingTopic,
  relatedLaws = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [storyText, setStoryText] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(collections[0]?.id || 'default');
  const cardRef = useRef<HTMLDivElement | null>(null);

  const statusIcons = {
    proposed: <Clock size={16} className="text-amber-600" />,
    passed: <CheckCircle size={16} className="text-emerald-600" />,
    rejected: <XCircle size={16} className="text-rose-600" />,
    updated: <AlertTriangle size={16} className="text-indigo-600" />,
  };
  const levelIcons = {
    federal: <Landmark size={14} />,
    state: <Building2 size={14} />,
    county: <MapIcon size={14} />,
    city: <Globe size={14} />,
  };
  const glossaryMap = useMemo(() => new Map((law.glossary || []).map((item) => [item.term.toLowerCase(), item.definition])), [law.glossary]);

  const renderGlossaryText = (text: string) => {
    if (!law.glossary?.length) return text;
    const terms = law.glossary.map((item) => item.term).sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`\\b(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
    return text.split(pattern).map((segment, index) => {
      const definition = glossaryMap.get(segment.toLowerCase());
      return definition ? (
        <span key={`${segment}-${index}`} title={definition} className="cursor-help rounded-md bg-emerald-100 px-1 py-0.5 text-emerald-700 underline decoration-dotted underline-offset-4">
          {segment}
        </span>
      ) : (
        <React.Fragment key={`${segment}-${index}`}>{segment}</React.Fragment>
      );
    });
  };

  const handleGenerateLetter = async (stance: 'support' | 'oppose') => {
    setIsGeneratingLetter(true);
    try {
      setGeneratedLetter(await generateAdvocacyLetter(law, stance));
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const handleAudioSummary = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${law.title}. ${law.simplifiedSummary}. ${law.personalImpact || law.impact}`);
    window.speechSynthesis.speak(utterance);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(law.id, commentText);
    setCommentText('');
  };

  const handleStorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyText.trim() || !onAddImpactStory) return;
    onAddImpactStory(law.id, storyText);
    setStoryText('');
  };

  const copyToClipboard = async () => {
    if (!generatedLetter) return;
    await navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!isHighlighted) return;
    setIsExpanded(true);
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isHighlighted]);

  return (
    <motion.div ref={cardRef} layout className={`relative mb-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm ${isComparing ? 'ring-2 ring-amber-500 ring-offset-2' : ''} ${isHighlighted ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium capitalize text-slate-700">
            {statusIcons[law.status]}
            {law.status}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium capitalize text-slate-700">
            {levelIcons[law.level]}
            {law.level}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-500">
          <Clock size={14} />
          {law.date}
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-indigo-600">{law.category}</p>
          {onToggleFollowTopic && (
            <button onClick={() => onToggleFollowTopic(law.category)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${isFollowingTopic ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
              {isFollowingTopic ? 'Following' : 'Follow topic'}
            </button>
          )}
        </div>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{law.title}</h3>
      </div>

      <div className="mb-6 rounded-[22px] border border-slate-200 bg-slate-50 p-5">
        <p className="text-base leading-7 text-slate-700">{renderGlossaryText(law.simplifiedSummary)}</p>
      </div>

      {law.poll && (
        <div className="mb-8 rounded-[32px] border-2 border-slate-100 bg-white p-8 shadow-inner">
          <h4 className="mb-4 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-indigo-950"><BarChart3 size={20} className="text-indigo-600" /> Community Sentiment</h4>
          <p className="mb-6 text-lg font-black text-indigo-950">{law.poll.question}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {law.poll.options.map((option) => (
              <button key={option.label} onClick={() => onPollVote(law.id, option.label)} className={`rounded-2xl border-2 p-5 text-left ${law.poll?.userChoice === option.label ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-indigo-950">{option.label}</span>
                  <span className="text-xs font-black text-indigo-600">{option.count}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
        <div className="flex items-center gap-3">
          <button onClick={() => onVote(law.id, 'support')} className={`rounded-full px-4 py-2 text-xs font-medium ${law.userVote === 'support' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}><ThumbsUp size={16} /> {law.votes?.support || 0}</button>
          <button onClick={() => onVote(law.id, 'oppose')} className={`rounded-full px-4 py-2 text-xs font-medium ${law.userVote === 'oppose' ? 'bg-rose-100 text-rose-700' : 'text-slate-500 hover:bg-slate-50'}`}><ThumbsDown size={16} /> {law.votes?.oppose || 0}</button>
          <button onClick={() => setShowComments((prev) => !prev)} className="rounded-full px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"><MessageSquare size={16} /> {law.comments?.length || 0}</button>
        </div>
        <div className="flex items-center gap-3">
          {onCompare && <button onClick={() => onCompare(law)} className="rounded-2xl border-2 border-slate-100 p-3 text-slate-400 hover:border-amber-500 hover:text-amber-500"><BarChart3 size={18} /></button>}
          <button onClick={handleAudioSummary} className="rounded-2xl border-2 border-slate-100 p-3 text-slate-400 hover:border-indigo-600 hover:text-indigo-600"><Volume2 size={18} /></button>
          {law.sourceUrl && <a href={law.sourceUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-500">Source</a>}
          <button onClick={() => onSave(law.id)} className={`rounded-2xl border-2 p-3 ${law.saved ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 text-slate-400'}`}><Bookmark size={18} fill={law.saved ? 'currentColor' : 'none'} /></button>
          <button onClick={() => setIsExpanded((prev) => !prev)} className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-medium text-white">{isExpanded ? 'Less' : 'Details'} {isExpanded ? <ChevronUp size={16} className="inline" /> : <ChevronDown size={16} className="inline" />}</button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-8 overflow-hidden border-t border-slate-100 pt-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="rounded-[32px] border-2 border-indigo-100 bg-indigo-50/30 p-8 lg:col-span-2">
                <h4 className="mb-4 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-indigo-900"><Sparkles size={20} /> AI Personal Impact</h4>
                <p className="text-lg font-bold leading-relaxed text-indigo-950">{renderGlossaryText(law.personalImpact || law.impact)}</p>
              </div>
              <div className="rounded-[32px] border-2 border-amber-100 bg-amber-50/40 p-8">
                <h4 className="mb-4 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-amber-900"><ShieldAlert size={20} /> Legislation Velocity</h4>
                <p className="text-3xl font-black text-amber-600">{law.velocityScore || 0}</p>
              </div>

              <div className="rounded-[32px] border-2 border-indigo-100 bg-indigo-50/30 p-8">
                <h4 className="mb-4 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-indigo-600"><Clock size={18} /> Legislative Lifecycle</h4>
                <div className="space-y-4">
                  {law.timeline?.map((item, idx) => (
                    <div key={idx}>
                      <p className="text-xs font-black uppercase tracking-tight text-indigo-950">{item.stage}</p>
                      <p className="text-[10px] font-bold text-slate-400">{item.date}</p>
                      <p className="text-[11px] font-bold text-slate-500">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {law.glossary && law.glossary.length > 0 && (
                <div className="rounded-[32px] border-2 border-emerald-100 bg-emerald-50/30 p-8 lg:col-span-2">
                  <h4 className="mb-4 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-emerald-900"><BookOpen size={20} /> Legal Glossary</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {law.glossary.map((item) => (
                      <div key={item.term} className="rounded-2xl border border-emerald-100 bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-tight text-emerald-700">{item.term}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-500">{item.definition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[32px] border-2 border-rose-100 bg-rose-50/30 p-8 lg:col-span-3">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <h4 className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-rose-900"><Mail size={20} /> Civic Action</h4>
                  <div className="flex gap-3">
                    <button onClick={() => handleGenerateLetter('support')} disabled={isGeneratingLetter} className="rounded-2xl bg-emerald-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white">Support Letter</button>
                    <button onClick={() => handleGenerateLetter('oppose')} disabled={isGeneratingLetter} className="rounded-2xl bg-rose-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white">Opposition Letter</button>
                  </div>
                </div>
                {generatedLetter && (
                  <div className="relative rounded-2xl border border-rose-100 bg-white p-8">
                    <button onClick={copyToClipboard} className="absolute right-6 top-6 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <div className="whitespace-pre-wrap pr-12 font-serif text-sm leading-relaxed text-slate-700">{generatedLetter}</div>
                  </div>
                )}
              </div>

              {collections.length > 0 && onSaveToCollection && (
                <div className="rounded-[32px] border-2 border-cyan-100 bg-cyan-50/30 p-8 lg:col-span-3">
                  <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-cyan-900">Collective Bookmarks</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <select value={selectedCollection} onChange={(e) => setSelectedCollection(e.target.value)} className="rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-xs font-black text-slate-700">
                      {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                    </select>
                    <button onClick={() => onSaveToCollection(law.id, selectedCollection)} className="rounded-2xl bg-cyan-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white">Save to Collection</button>
                  </div>
                </div>
              )}

              {law.hearings && law.hearings.length > 0 && (
                <div className="rounded-[32px] border-2 border-violet-100 bg-violet-50/30 p-8 lg:col-span-3">
                  <h4 className="mb-4 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-violet-900"><CalendarDays size={20} /> Hearing Calendar</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {law.hearings.map((hearing) => (
                      <div key={hearing.id} className="rounded-2xl border border-violet-100 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">{hearing.type}</p>
                        <p className="mt-2 text-sm font-black text-slate-900">{hearing.title}</p>
                        <p className="mt-2 text-xs font-bold text-slate-500">{hearing.date} · {hearing.venue}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {law.advocacyGroups && law.advocacyGroups.length > 0 && (
                <div className="rounded-[32px] border-2 border-sky-100 bg-sky-50/30 p-8 lg:col-span-3">
                  <h4 className="mb-4 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-sky-900"><Users size={20} /> Advocacy Groups Directory</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {law.advocacyGroups.map((group) => (
                      <div key={group.id} className="rounded-2xl border border-sky-100 bg-white p-4">
                        <p className="text-sm font-black text-slate-900">{group.name}</p>
                        <p className="mt-2 text-xs font-bold text-slate-500">{group.mission}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relatedLaws.length > 0 && (
                <div className="rounded-[32px] border-2 border-slate-100 bg-slate-50 p-8 lg:col-span-3">
                  <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-900">Related Laws Recommendation</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {relatedLaws.map((relatedLaw) => (
                      <div key={relatedLaw.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{relatedLaw.category}</p>
                        <p className="mt-2 text-sm font-black text-slate-900">{relatedLaw.title}</p>
                        <p className="mt-2 text-xs font-bold text-slate-500">{relatedLaw.simplifiedSummary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[32px] border-2 border-slate-200 bg-slate-50 p-8 lg:col-span-3">
                <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-900">Official Documentation</h4>
                <div className="max-h-[300px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 font-mono text-xs leading-relaxed text-slate-500">{law.originalText}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-8 overflow-hidden border-t border-slate-100 pt-8">
            <h4 className="mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Community Dialogue</h4>
            <form onSubmit={handleCommentSubmit} className="mb-8 flex gap-4">
              <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Share your perspective..." className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold text-slate-900 outline-none" />
              <button type="submit" disabled={!commentText.trim()} className="rounded-2xl bg-indigo-600 px-8 py-4 font-black text-white"><Send size={22} /></button>
            </form>
            <div className="space-y-4">
              {(law.comments || []).map((comment) => (
                <div key={comment.id} className="rounded-3xl border-2 border-slate-50 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-600">{comment.userName}</span>
                    <span className="text-[10px] font-bold text-slate-400">{comment.date}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{comment.text}</p>
                  {comment.status === 'flagged' && comment.moderationNote && <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-rose-500">{comment.moderationNote}</p>}
                </div>
              ))}
            </div>

            {onAddImpactStory && (
              <div className="mt-10 border-t border-slate-100 pt-8">
                <h4 className="mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Crowd-sourced Impact Stories</h4>
                <form onSubmit={handleStorySubmit} className="mb-8 flex gap-4">
                  <input value={storyText} onChange={(e) => setStoryText(e.target.value)} placeholder="Describe how this law affects you..." className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold text-slate-900 outline-none" />
                  <button type="submit" disabled={!storyText.trim()} className="rounded-2xl bg-emerald-600 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white">Share Story</button>
                </form>
                <div className="space-y-4">
                  {(law.impactStories || []).map((story) => (
                    <div key={story.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-600">{story.author}</p>
                        <p className="text-[10px] font-bold text-slate-400">{story.verified ? 'Verified' : 'Community'} · {story.date}</p>
                      </div>
                      <p className="mt-3 text-sm font-bold text-slate-700">{story.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LawCard;
