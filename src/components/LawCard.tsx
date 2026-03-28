import React, { useMemo, useState } from 'react';
import { Bookmark, ThumbsUp, ThumbsDown, Info, ChevronDown, ChevronUp, CheckCircle, Clock, AlertTriangle, XCircle, Globe, Map, Building2, Landmark, MessageSquare, Send, BarChart3, Sparkles, BookOpen, Mail, Copy, Check, Volume2, ShieldAlert, CalendarDays, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  onToggleFollowTopic?: (topic: string) => void;
  isFollowingTopic?: boolean;
  relatedLaws?: Law[];
}

const LawCard: React.FC<LawCardProps> = ({ law, onSave, onVote, onComment, onPollVote, onAddImpactStory, onSaveToCollection, collections = [], onCompare, isComparing, onToggleFollowTopic, isFollowingTopic, relatedLaws = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [storyText, setStoryText] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(collections[0]?.id || 'default');

  const statusIcons = {
    proposed: <Clock size={16} className="text-amber-600" />,
    passed: <CheckCircle size={16} className="text-emerald-600" />,
    rejected: <XCircle size={16} className="text-rose-600" />,
    updated: <AlertTriangle size={16} className="text-indigo-600" />,
  };

  const statusColors = {
    proposed: "bg-amber-50 text-amber-700 border-amber-200 shadow-sm",
    passed: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm",
    rejected: "bg-rose-50 text-rose-700 border-rose-200 shadow-sm",
    updated: "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm",
  };

  const levelIcons = {
    federal: <Landmark size={14} />,
    state: <Building2 size={14} />,
    county: <Map size={14} />,
    city: <Globe size={14} />,
  };

  const levelColors = {
    federal: "bg-purple-50 text-purple-700 border-purple-200",
    state: "bg-blue-50 text-blue-700 border-blue-200",
    county: "bg-teal-50 text-teal-700 border-teal-200",
    city: "bg-sky-50 text-sky-700 border-sky-200",
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(law.id, commentText);
    setCommentText('');
  };

  const handleImpactStorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyText.trim() || !onAddImpactStory) return;
    onAddImpactStory(law.id, storyText);
    setStoryText('');
  };

  const handleGenerateLetter = async (stance: 'support' | 'oppose') => {
    setIsGeneratingLetter(true);
    setGeneratedLetter(null);
    try {
      const letter = await generateAdvocacyLetter(law, stance);
      setGeneratedLetter(letter);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLetter) return;
    navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalPollVotes = law.poll?.options.reduce((acc, opt) => acc + opt.count, 0) || 0;
  const progressStages = ['introduced', 'committee', 'voting', 'passed', 'law'];
  const activeStageIndex = Math.max(
    0,
    progressStages.findIndex(stage => stage === law.timeline?.[law.timeline.length - 1]?.stage)
  );
  const glossaryMap = useMemo(() => new Map((law.glossary || []).map(item => [item.term.toLowerCase(), item.definition])), [law.glossary]);

  const renderGlossaryText = (text: string) => {
    if (!law.glossary || law.glossary.length === 0) return text;
    const terms = law.glossary.map(item => item.term).sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`\\b(${terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
    const segments = text.split(pattern);
    return segments.map((segment, index) => {
      const definition = glossaryMap.get(segment.toLowerCase());
      if (!definition) {
        return <React.Fragment key={`${segment}-${index}`}>{segment}</React.Fragment>;
      }
      return (
        <span
          key={`${segment}-${index}`}
          title={definition}
          className="cursor-help rounded-md bg-emerald-100 px-1 py-0.5 text-emerald-700 underline decoration-dotted underline-offset-4"
        >
          {segment}
        </span>
      );
    });
  };

  const handleAudioSummary = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${law.title}. ${law.simplifiedSummary}. ${law.personalImpact || law.impact}`);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <motion.div 
      layout
      className={`group relative mb-8 overflow-hidden rounded-[40px] bg-white p-2 shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl hover:shadow-indigo-100 ${isComparing ? 'ring-4 ring-amber-500 ring-offset-4' : ''}`}
    >
      <div className="p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest ${statusColors[law.status]}`}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white shadow-sm">
                {statusIcons[law.status]}
              </div>
              {law.status}
            </div>
            <div className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest ${levelColors[law.level]}`}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white shadow-sm">
                {levelIcons[law.level]}
              </div>
              {law.level}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <Clock size={14} />
            {law.date}
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-12 rounded-full bg-indigo-600" />
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">{law.category}</p>
            </div>
            {onToggleFollowTopic && (
              <button 
                onClick={() => onToggleFollowTopic(law.category)}
                className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${isFollowingTopic ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white'}`}
              >
                {isFollowingTopic ? 'FOLLOWING' : '+ FOLLOW TOPIC'}
              </button>
            )}
          </div>
          <h3 className="text-3xl font-black leading-tight tracking-tighter text-indigo-950">{law.title}</h3>
        </div>

        <div className="mb-8 rounded-[32px] bg-slate-50 p-8 border-2 border-slate-100">
          <h4 className="mb-4 flex items-center gap-3 text-xs font-black text-indigo-600 uppercase tracking-widest">
            <Info size={20} />
            The Gist
          </h4>
          <p className="text-xl font-bold leading-relaxed text-slate-700">{law.simplifiedSummary}</p>
          {law.glossary && law.glossary.length > 0 && (
            <p className="mt-4 text-sm font-bold leading-relaxed text-slate-600">{renderGlossaryText(law.simplifiedSummary)}</p>
          )}
        </div>

        {/* Public Feedback System (Polls) */}
        {law.poll && (
          <div className="mb-8 rounded-[32px] border-2 border-slate-100 bg-white p-8 shadow-inner">
            <h4 className="mb-6 flex items-center gap-3 text-xs font-black text-indigo-950 uppercase tracking-widest">
              <BarChart3 size={20} className="text-indigo-600" />
              Community Sentiment
            </h4>
            <p className="mb-6 text-lg font-black text-indigo-950">{law.poll.question}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {law.poll.options.map((option) => {
                const percentage = totalPollVotes > 0 ? Math.round((option.count / totalPollVotes) * 100) : 0;
                const isSelected = law.poll?.userChoice === option.label;
                
                return (
                  <button
                    key={option.label}
                    onClick={() => onPollVote(law.id, option.label)}
                    className={`relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100' : 'border-slate-100 bg-white hover:border-indigo-600/50'}`}
                  >
                    <div 
                      className="absolute left-0 top-0 h-full bg-indigo-600/10 transition-all duration-1000 ease-out" 
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative flex items-center justify-between">
                      <span className="text-sm font-black text-indigo-950">{option.label}</span>
                      <span className="text-xs font-black text-indigo-600">{percentage}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-6 border-t border-slate-100 pt-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onVote(law.id, 'support')}
              className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-xs font-black transition-all ${law.userVote === 'support' ? 'bg-emerald-100 text-emerald-700 shadow-lg shadow-emerald-100' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}
            >
              <ThumbsUp size={20} />
              {law.votes?.support || 0}
            </button>
            <button 
              onClick={() => onVote(law.id, 'oppose')}
              className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-xs font-black transition-all ${law.userVote === 'oppose' ? 'bg-rose-100 text-rose-700 shadow-lg shadow-rose-100' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}
            >
              <ThumbsDown size={20} />
              {law.votes?.oppose || 0}
            </button>
            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-xs font-black transition-all ${showComments ? 'bg-indigo-100 text-indigo-700 shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}
            >
              <MessageSquare size={20} />
              {law.comments?.length || 0}
            </button>
          </div>

          <div className="flex items-center gap-4">
            {onCompare && (
              <button 
                onClick={() => onCompare(law)}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-all ${isComparing ? 'bg-amber-500 text-white border-amber-500 shadow-xl shadow-amber-100' : 'border-slate-100 text-slate-400 hover:border-amber-500 hover:text-amber-500'}`}
                title="Compare"
              >
                <BarChart3 size={22} />
              </button>
            )}
            {law.sourceUrl && (
              <a 
                href={law.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-12 items-center gap-3 rounded-2xl border-2 border-slate-100 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all hover:border-indigo-600 hover:text-indigo-600"
              >
                <Globe size={18} />
                SOURCE
              </a>
            )}
            <button 
              onClick={handleAudioSummary}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-100 text-slate-400 transition-all hover:border-indigo-600 hover:text-indigo-600"
              title="Listen to summary"
            >
              <Volume2 size={20} />
            </button>
            <button 
              onClick={() => onSave(law.id)}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-all ${law.saved ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100' : 'border-slate-100 text-slate-400 hover:border-indigo-600 hover:text-indigo-600'}`}
              title={law.saved ? "Unsave" : "Save"}
            >
              <Bookmark size={22} fill={law.saved ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-3 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${isExpanded ? 'bg-indigo-950 text-white shadow-xl' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:scale-105'}`}
            >
              {isExpanded ? "LESS" : "DETAILS"}
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Expanded Details Section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 overflow-hidden border-t border-slate-100 pt-8"
            >
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Personal Impact Card */}
                <div className="rounded-[32px] border-2 border-indigo-100 bg-indigo-50/30 p-8 lg:col-span-2">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-sm">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-indigo-900">AI Personal Impact</h4>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Tailored to your situation</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-indigo-950 leading-relaxed">
                    {renderGlossaryText(law.personalImpact || law.impact)}
                  </p>
                </div>

                {/* Timeline View */}
                <div className="rounded-[32px] border-2 border-indigo-100 bg-indigo-50/30 p-8">
                  <h4 className="mb-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                    <Clock size={18} />
                    Legislative Lifecycle
                  </h4>
                  <div className="space-y-6">
                    <div className="grid grid-cols-5 gap-2">
                      {progressStages.map((stage, index) => (
                        <div key={stage} className="space-y-2">
                          <div className={`h-2 rounded-full ${index <= activeStageIndex ? 'bg-indigo-600' : 'bg-indigo-100'}`} />
                          <p className={`text-[9px] font-black uppercase tracking-widest ${index <= activeStageIndex ? 'text-indigo-700' : 'text-slate-400'}`}>{stage}</p>
                        </div>
                      ))}
                    </div>
                    {law.timeline?.map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="h-4 w-4 rounded-full border-2 border-indigo-600 bg-white" />
                          {idx !== law.timeline!.length - 1 && <div className="h-full w-0.5 bg-indigo-200" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-xs font-black text-indigo-950 uppercase tracking-tight">{item.stage}</p>
                          <p className="text-[10px] font-bold text-slate-400">{item.date}</p>
                          <p className="mt-1 text-[11px] font-bold text-slate-500">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[32px] border-2 border-amber-100 bg-amber-50/40 p-8">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm">
                      <ShieldAlert size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-amber-900">Conflict Detector</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Legislation velocity and overlap risk</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm border border-amber-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Velocity Score</p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-amber-600">{law.velocityScore || 0}</p>
                    <p className="mt-3 text-xs font-bold text-slate-500">
                      Higher scores mean the bill is moving quickly through public and legislative checkpoints.
                    </p>
                  </div>
                </div>

                {/* Legal Glossary Section */}
                {law.glossary && law.glossary.length > 0 && (
                  <div className="rounded-[32px] border-2 border-emerald-100 bg-emerald-50/30 p-8 lg:col-span-3">
                    <div className="mb-6 flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-emerald-900">Legal Glossary</h4>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Complex terms simplified</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {law.glossary.map((item, idx) => (
                        <div key={idx} className="rounded-2xl bg-white p-5 shadow-sm border border-emerald-100">
                          <p className="text-xs font-black text-emerald-700 uppercase tracking-tight mb-1">{item.term}</p>
                          <p className="text-[11px] font-bold text-slate-500 leading-relaxed">{item.definition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Civic Action Section */}
                <div className="rounded-[32px] border-2 border-rose-100 bg-rose-50/30 p-8 lg:col-span-3">
                  <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-sm">
                        <Mail size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-rose-900">Civic Action</h4>
                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Make your voice heard</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleGenerateLetter('support')}
                        disabled={isGeneratingLetter}
                        className="rounded-2xl bg-emerald-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-100 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      >
                        {isGeneratingLetter ? "DRAFTING..." : "DRAFT SUPPORT LETTER"}
                      </button>
                      <button 
                        onClick={() => handleGenerateLetter('oppose')}
                        disabled={isGeneratingLetter}
                        className="rounded-2xl bg-rose-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-rose-100 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      >
                        {isGeneratingLetter ? "DRAFTING..." : "DRAFT OPPOSITION LETTER"}
                      </button>
                    </div>
                  </div>

                  {generatedLetter && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative rounded-2xl bg-white p-8 shadow-inner border border-rose-100"
                    >
                      <button 
                        onClick={copyToClipboard}
                        className="absolute right-6 top-6 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? "COPIED" : "COPY"}
                      </button>
                      <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-700 pr-12">
                        {generatedLetter}
                      </div>
                    </motion.div>
                  )}
                </div>

                {collections.length > 0 && onSaveToCollection && (
                  <div className="rounded-[32px] border-2 border-cyan-100 bg-cyan-50/30 p-8 lg:col-span-3">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-cyan-900">Collective Bookmarks</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600">Add this law to a shared watchlist</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={selectedCollection}
                          onChange={(e) => setSelectedCollection(e.target.value)}
                          className="rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-xs font-black text-slate-700 outline-none"
                        >
                          {collections.map(collection => (
                            <option key={collection.id} value={collection.id}>{collection.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => onSaveToCollection(law.id, selectedCollection)}
                          className="rounded-2xl bg-cyan-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-cyan-100 transition-all hover:scale-105"
                        >
                          Save to Collection
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {law.hearings && law.hearings.length > 0 && (
                  <div className="rounded-[32px] border-2 border-violet-100 bg-violet-50/30 p-8 lg:col-span-3">
                    <div className="mb-6 flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shadow-sm">
                        <CalendarDays size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-violet-900">Hearing Calendar</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Upcoming opportunities to testify</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {law.hearings.map(hearing => (
                        <div key={hearing.id} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
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
                    <div className="mb-6 flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 shadow-sm">
                        <Users size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-sky-900">Advocacy Groups Directory</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">Organizations working on this issue</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {law.advocacyGroups.map(group => (
                        <div key={group.id} className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                          <p className="text-sm font-black text-slate-900">{group.name}</p>
                          <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">{group.mission}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {relatedLaws.length > 0 && (
                  <div className="rounded-[32px] border-2 border-slate-100 bg-slate-50 p-8 lg:col-span-3">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Related Laws Recommendation</h4>
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                      {relatedLaws.map(relatedLaw => (
                        <div key={relatedLaw.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{relatedLaw.category}</p>
                          <p className="mt-2 text-sm font-black text-slate-900">{relatedLaw.title}</p>
                          <p className="mt-2 text-xs font-bold text-slate-500">{relatedLaw.simplifiedSummary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Official Text Card */}
                <div className="rounded-[32px] border-2 border-slate-200 bg-slate-50 p-8 lg:col-span-3">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm border border-slate-100">
                      <Landmark size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Official Documentation</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Raw legislative text</p>
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto rounded-2xl bg-white p-8 font-mono text-xs leading-relaxed text-slate-500 border border-slate-200 shadow-inner custom-scrollbar">
                    {law.originalText}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 overflow-hidden border-t border-slate-100 pt-8"
            >
              <h4 className="mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Community Dialogue</h4>
              
              <form onSubmit={handleCommentSubmit} className="mb-8 flex gap-4">
                <input 
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your perspective..."
                  className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold text-slate-900 outline-none ring-indigo-600 transition-all focus:ring-2"
                />
                <button 
                  type="submit"
                  disabled={!commentText.trim()}
                  className="rounded-2xl bg-indigo-600 px-8 py-4 text-white font-black shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  <Send size={22} />
                </button>
              </form>

              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                {law.comments && law.comments.length > 0 ? (
                  law.comments.map(comment => (
                    <div key={comment.id} className="rounded-3xl bg-white p-6 border-2 border-slate-50 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{comment.userName}</span>
                        <span className="text-[10px] font-bold text-slate-400">{comment.date}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 leading-relaxed">{comment.text}</p>
                      {comment.status === 'flagged' && comment.moderationNote && (
                        <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-rose-500">{comment.moderationNote}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <MessageSquare size={48} className="mx-auto mb-4 text-slate-100" />
                    <p className="text-sm text-slate-400 font-bold italic">No perspectives shared yet. Be the first to contribute!</p>
                  </div>
                )}
              </div>

              {onAddImpactStory && (
                <div className="mt-10 border-t border-slate-100 pt-8">
                  <h4 className="mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Crowd-sourced Impact Stories</h4>
                  <form onSubmit={handleImpactStorySubmit} className="mb-8 flex gap-4">
                    <input
                      type="text"
                      value={storyText}
                      onChange={(e) => setStoryText(e.target.value)}
                      placeholder="Describe how this law affects you..."
                      className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold text-slate-900 outline-none ring-indigo-600 transition-all focus:ring-2"
                    />
                    <button
                      type="submit"
                      disabled={!storyText.trim()}
                      className="rounded-2xl bg-emerald-600 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-100 transition-all hover:scale-105 disabled:opacity-50"
                    >
                      Share Story
                    </button>
                  </form>
                  <div className="space-y-4">
                    {(law.impactStories || []).length > 0 ? (law.impactStories || []).map(story => (
                      <div key={story.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs font-black uppercase tracking-widest text-emerald-600">{story.author}</p>
                          <p className="text-[10px] font-bold text-slate-400">{story.verified ? 'Verified' : 'Community'} · {story.date}</p>
                        </div>
                        <p className="mt-3 text-sm font-bold leading-relaxed text-slate-700">{story.text}</p>
                      </div>
                    )) : (
                      <p className="text-sm font-bold italic text-slate-400">No impact stories yet. Add the first one.</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LawCard;
