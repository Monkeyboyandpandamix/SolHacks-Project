import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scale, MessageSquare, Shield, CheckCircle, XCircle, ChevronRight, User, DollarSign, Zap, RefreshCw, AlertTriangle } from 'lucide-react';
import { fireConfetti } from '../utils/confetti';

interface Attorney {
  id: string;
  name: string;
  style: string;
  cost: number;
  experience: number;
  aggressiveness: number;
  description: string;
  color: string;
}

const ATTORNEYS: Attorney[] = [
  {
    id: 'defender',
    name: 'Sarah The Defender',
    style: 'Empathy & Truth',
    cost: 1,
    experience: 3,
    aggressiveness: 1,
    description: "Low cost, highly empathetic. Great for honest explanations and asking for leniency.",
    color: 'emerald'
  },
  {
    id: 'negotiator',
    name: 'Marcus The Tactician',
    style: 'Evidence & Logic',
    cost: 3,
    experience: 4,
    aggressiveness: 3,
    description: "Strategic and prepared. Uses hard evidence and procedural rules to win cases.",
    color: 'indigo'
  },
  {
    id: 'litigator',
    name: 'Rex The Shark',
    style: 'Intimidation',
    cost: 5,
    experience: 5,
    aggressiveness: 5,
    description: "Very expensive and aggressive. Will attack the prosecution's claims directly.",
    color: 'rose'
  }
];

interface DialogueOption {
  text: string;
  points: number;
  feedback: string;
  bestFor: string; // The attorney style that works best with this
}

interface Question {
  judgePrompt: string;
  options: DialogueOption[];
}

const SCENARIO_QUESTIONS: Question[] = [
  {
    judgePrompt: "You stand accused of parking in a restricted commercial loading zone. How do you plead?",
    options: [
      { text: "Not guilty, your honor. The red paint was completely faded and there was no visible signage.", points: 2, feedback: "A solid procedural defense.", bestFor: 'negotiator' },
      { text: "Guilty, but with an explanation. I was rushing my pregnant wife to the hospital.", points: 2, feedback: "A sympathetic explanation.", bestFor: 'defender' },
      { text: "This court is a sham! I demand this ticket be thrown out immediately!", points: -2, feedback: "The judge does not appreciate being yelled at.", bestFor: 'litigator' }
    ]
  },
  {
    judgePrompt: "The ticketing officer stated you were parked for 45 minutes. What is your response?",
    options: [
      { text: "I lost track of time paying the hospital fee. I am truly sorry.", points: 2, feedback: "Honesty goes a long way.", bestFor: 'defender' },
      { text: "I demand to cross-examine the officer's time logs! It was barely 10 minutes!", points: 2, feedback: "Aggressive, but effective at casting doubt.", bestFor: 'litigator' },
      { text: "We have timestamped dashcam footage proving the car arrived just 5 minutes prior.", points: 3, feedback: "Undeniable evidence wins.", bestFor: 'negotiator' }
    ]
  },
  {
    judgePrompt: "I've heard enough. Is there any final statement before I render a verdict?",
    options: [
      { text: "I ask for leniency, your honor. I have a clean driving record.", points: 2, feedback: "A respectful closing.", bestFor: 'defender' },
      { text: "Dismiss this ticket, or we will appeal this to the district court.", points: 1, feedback: "A risky threat.", bestFor: 'litigator' },
      { text: "Based on municipal code 42.B, the burden of proof has not been met. We ask for dismissal.", points: 3, feedback: "Flawless legal technicality.", bestFor: 'negotiator' }
    ]
  }
];

export default function CourtSimulator() {
  const [phase, setPhase] = useState<'intro' | 'selection' | 'hearing' | 'verdict'>('intro');
  const [selectedAttorney, setSelectedAttorney] = useState<Attorney | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [chatHistory, setChatHistory] = useState<{role: 'judge'|'user', text: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const resetGame = () => {
    setPhase('intro');
    setSelectedAttorney(null);
    setQuestionIndex(0);
    setScore(0);
    setChatHistory([]);
  };

  const handleSelectAttorney = (attorney: Attorney) => {
    setSelectedAttorney(attorney);
    setPhase('hearing');
    setChatHistory([{ role: 'judge', text: SCENARIO_QUESTIONS[0].judgePrompt }]);
  };

  const handleAnswer = (option: DialogueOption) => {
    // Add user response to chat
    setChatHistory(prev => [...prev, { role: 'user', text: option.text }]);
    
    // Calculate points: base points + synergy bonus if user attorney matches
    let pointsEarned = option.points;
    if (selectedAttorney?.id === option.bestFor) {
      pointsEarned += 2; // Synergy bonus
    }
    setScore(prev => prev + pointsEarned);

    setIsTyping(true);
    
    // Simulate judge thinking
    setTimeout(() => {
      setIsTyping(false);
      
      const newIndex = questionIndex + 1;
      if (newIndex < SCENARIO_QUESTIONS.length) {
        setChatHistory(prev => [...prev, { role: 'judge', text: SCENARIO_QUESTIONS[newIndex].judgePrompt }]);
        setQuestionIndex(newIndex);
      } else {
        setPhase('verdict');
        triggerVerdictConfetti(score + pointsEarned);
      }
    }, 1500);
  };

  const triggerVerdictConfetti = (finalScore: number) => {
    if (finalScore >= 6) {
      fireConfetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#ffffff']
      });
    }
  };

  let verdictTitle = "";
  let verdictColor = "";
  let verdictMessage = "";

  if (score >= 7) {
    verdictTitle = "CASE DISMISSED";
    verdictColor = "text-emerald-600";
    verdictMessage = "Excellent work! Your attorney synergized perfectly with your answers. The judge dropped all charges.";
  } else if (score >= 4) {
    verdictTitle = "REDUCED FINE";
    verdictColor = "text-amber-500";
    verdictMessage = "You made some good points, but there were inconsistencies. The judge reduced the ticket to a warning fee.";
  } else {
    verdictTitle = "GUILTY";
    verdictColor = "text-rose-600";
    verdictMessage = "A complete disaster in the courtroom. Your strategy failed and you must pay the maximum penalty.";
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-10">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Courtroom Simulator</h2>
        <p className="mt-2 font-bold text-slate-400">Experience civic dispute resolution first-hand.</p>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-[40px] bg-white p-12 shadow-xl border-2 border-slate-100 text-center"
          >
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-8">
              <Scale size={48} />
            </div>
            <h3 className="text-3xl font-black text-indigo-950 mb-4">Traffic Court Appeal</h3>
            <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto font-bold leading-relaxed">
              You've received a $450 ticket for parking in a commercial loading zone. You believe the ticket was issued unfairly. It's time to hire an attorney and step into the courtroom.
            </p>
            <button
              onClick={() => setPhase('selection')}
              className="rounded-2xl bg-indigo-600 px-10 py-5 text-sm font-black text-white shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
            >
              HIRE AN ATTORNEY
            </button>
          </motion.div>
        )}

        {phase === 'selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-2xl font-black tracking-tight text-indigo-950 mb-8 text-center">Select Your Counsel</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ATTORNEYS.map((attorney) => (
                <div 
                  key={attorney.id}
                  className={`relative flex flex-col justify-between rounded-3xl border-2 p-8 transition-all hover:shadow-xl bg-white ${
                    attorney.color === 'emerald' ? 'border-emerald-100 hover:border-emerald-300' :
                    attorney.color === 'indigo' ? 'border-indigo-100 hover:border-indigo-300' :
                    'border-rose-100 hover:border-rose-300'
                  }`}
                >
                  <div>
                    <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-${attorney.color}-50 text-${attorney.color}-600`}>
                      <User size={32} />
                    </div>
                    <h4 className="text-xl font-black text-slate-900">{attorney.name}</h4>
                    <p className={`text-[10px] font-black uppercase tracking-widest text-${attorney.color}-600 mt-1 mb-4`}>
                      {attorney.style}
                    </p>
                    <p className="text-sm font-bold text-slate-500 mb-6">{attorney.description}</p>
                    
                    <div className="space-y-3 mb-8">
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-slate-400">COST</span>
                        <div className="flex gap-1">
                          {Array.from({length: 5}).map((_, i) => (
                            <DollarSign key={i} size={14} className={i < attorney.cost ? `text-${attorney.color}-500` : 'text-slate-200'} />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-slate-400">EXPERIENCE</span>
                        <div className="flex gap-1">
                          {Array.from({length: 5}).map((_, i) => (
                            <Shield key={i} size={14} className={i < attorney.cost ? `text-${attorney.color}-500` : 'text-slate-200'} />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-slate-400">AGGRESSION</span>
                        <div className="flex gap-1">
                          {Array.from({length: 5}).map((_, i) => (
                            <Zap key={i} size={14} className={i < attorney.cost ? `text-${attorney.color}-500` : 'text-slate-200'} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleSelectAttorney(attorney)}
                    className={`w-full rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${
                      attorney.color === 'emerald' ? 'bg-emerald-600 shadow-emerald-200' :
                      attorney.color === 'indigo' ? 'bg-indigo-600 shadow-indigo-200' :
                      'bg-rose-600 shadow-rose-200'
                    }`}
                  >
                    SELECT {attorney.name}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {phase === 'hearing' && (
          <motion.div
            key="hearing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Attorney Context Panel */}
            <div className="rounded-3xl bg-indigo-950 p-8 text-white shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-${selectedAttorney?.color}-500 text-white shadow-sm`}>
                  <User size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-indigo-300">Your Counsel</h4>
                  <p className="text-lg font-bold">{selectedAttorney?.name}</p>
                </div>
              </div>
              <div className="bg-white/10 p-5 rounded-2xl">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-2">Strategy Tip:</p>
                <p className="text-sm font-bold opacity-90 leading-relaxed">
                  Remember, your attorney specializes in <strong>{selectedAttorney?.style}</strong>. Try to choose dialogue options that match this playstyle for a massive synergy bonus!
                </p>
              </div>
            </div>

            {/* Main Courtroom Chat */}
            <div className="lg:col-span-2 flex flex-col h-[600px] rounded-3xl bg-slate-50 border-2 border-slate-200 overflow-hidden shadow-inner">
              <div className="bg-white border-b border-slate-200 p-6 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-800">
                  <Scale size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Honorable Judge Carter</h3>
                  <p className="text-[10px] font-bold text-slate-400">Municipal Traffic Court</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {chatHistory.map((msg, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl p-5 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'}`}>
                      <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                       <span className="h-2 w-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                       <span className="h-2 w-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                       <span className="h-2 w-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Dialogue Options */}
              <div className="bg-white border-t border-slate-200 p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <MessageSquare size={14} /> SELECT YOUR RESPONSE
                </p>
                <div className="space-y-3">
                  {!isTyping && SCENARIO_QUESTIONS[questionIndex]?.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(option)}
                      className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 transition-all font-bold text-sm text-slate-700 flex items-center justify-between group"
                    >
                      <span className="pr-4">{option.text}</span>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'verdict' && (
          <motion.div
            key="verdict"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-[40px] p-12 shadow-2xl text-center border-4 ${
              score >= 7 ? 'bg-emerald-50 border-emerald-200' :
              score >= 4 ? 'bg-amber-50 border-amber-200' :
              'bg-rose-50 border-rose-200'
            }`}
          >
            <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-xl mb-8 ${verdictColor}`}>
              {score >= 7 ? <CheckCircle size={48} /> : score >= 4 ? <AlertTriangle size={48} /> : <XCircle size={48} />}
            </div>
            
            <h2 className={`text-6xl font-black tracking-tighter mb-4 ${verdictColor}`}>
              {verdictTitle}
            </h2>
            
            <p className="text-xl font-bold text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              {verdictMessage}
            </p>

            <div className="inline-block bg-white rounded-3xl border border-slate-200 p-6 mb-10 shadow-sm text-center min-w-[300px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Final Evaluation Score</p>
              <p className="text-5xl font-black text-slate-800">{score} <span className="text-lg text-slate-400">/ 11</span></p>
            </div>

            <div>
              <button
                onClick={resetGame}
                className="inline-flex items-center gap-3 rounded-2xl bg-indigo-600 px-10 py-5 text-sm font-black text-white shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
              >
                <RefreshCw size={18} />
                PLAY ANOTHER SCENARIO
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
