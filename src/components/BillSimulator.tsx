import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertTriangle, BookOpen, XCircle, RotateCcw, ThumbsUp, Landmark, ShieldCheck, Mail, ArrowRight } from 'lucide-react';

type Choice = {
  text: string;
  nextState: string;
  impactText: string;
  publicSupport: number;
  politicalCapital: number;
};

type Scenario = {
  id: string;
  title: string;
  description: string;
  type: 'committee' | 'floor' | 'executive' | 'end';
  choices: Choice[];
};

const SCENARIOS: Record<string, Scenario> = {
  'start': {
    id: 'start',
    title: 'The Education Funding Act',
    description: 'You are an elected official proposing a bill to increase state public school funding by 15%. However, this requires a controversial new tax. Your bill is in the Education Committee. To get out of committee, you face resistance from fiscal conservatives.',
    type: 'committee',
    choices: [
      { text: 'Hold ground: insist on the full 15% increase and new tax.', nextState: 'committee_fail', impactText: 'The committee chair refuses to bring it to a vote.', publicSupport: 10, politicalCapital: -10 },
      { text: 'Compromise: drop the tax and cut the increase to 5%.', nextState: 'floor_easy', impactText: 'The committee passes the weakened bill easily.', publicSupport: -10, politicalCapital: 10 },
      { text: 'Add an amendment: fund the 15% via a luxury goods tax instead.', nextState: 'floor_hard', impactText: 'The committee narrowly passes the bill. Corporate lobbyists prepare for a fight.', publicSupport: 20, politicalCapital: -5 }
    ]
  },
  'committee_fail': {
    id: 'committee_fail',
    title: 'Stalled in Committee',
    description: 'Your bill is dead in committee. You can try a risky maneuver to bypass the committee (discharge petition) or let the bill die.',
    type: 'floor',
    choices: [
      { text: 'Launch a discharge petition to force a floor vote.', nextState: 'floor_hard', impactText: 'You burn massive political capital but get the bill to the floor.', publicSupport: 15, politicalCapital: -25 },
      { text: 'Let the bill die and try again next year.', nextState: 'end_fail', impactText: 'The legislative session ends without action on education.', publicSupport: -15, politicalCapital: 0 }
    ]
  },
  'floor_easy': {
    id: 'floor_easy',
    title: 'Floor Debate: The 5% Compromise',
    description: 'The weakened 5% bill is on the floor. Progressive advocates are furious and protesting outside the capitol. Do you champion this compromise or pull the bill?',
    type: 'floor',
    choices: [
      { text: 'Rally moderate support and pass the 5% bill.', nextState: 'exec_sign', impactText: 'The bill passes the legislature with bipartisan support.', publicSupport: -5, politicalCapital: 15 },
      { text: 'Pull the bill due to progressive backlash.', nextState: 'end_fail', impactText: 'You withdraw the bill. No new funding is secured.', publicSupport: -10, politicalCapital: -10 }
    ]
  },
  'floor_hard': {
    id: 'floor_hard',
    title: 'Floor Debate: The Luxury Tax Fight',
    description: 'Your 15% luxury tax bill hits the floor. Lobbyists are pressuring members to vote no. The vote is tied.',
    type: 'floor',
    choices: [
      { text: 'Make a backroom deal: exempt private yachts from the tax.', nextState: 'exec_veto_threat', impactText: 'The bill passes the legislature, but the public is highly skeptical of the exemption.', publicSupport: -15, politicalCapital: -5 },
      { text: 'Give a passionate floor speech calling out the lobbyists.', nextState: 'end_pass_narrow', impactText: 'The speech goes viral! A few holdouts flip. The bill barely passes!', publicSupport: 30, politicalCapital: -10 }
    ]
  },
  'exec_sign': {
    id: 'exec_sign',
    title: 'Executive Desk',
    description: 'The 5% compromise bill reaches the Governor\'s desk. The Governor will sign it, but wants to hold a massive press conference claiming all the credit.',
    type: 'executive',
    choices: [
      { text: 'Smile, attend the press conference, and clap.', nextState: 'end_success_moderate', impactText: 'The bill becomes law. You share the credit.', publicSupport: 10, politicalCapital: 10 },
      { text: 'Skip the press conference to protest the Governor taking credit.', nextState: 'end_success_snub', impactText: 'The bill becomes law, but you angered the Governor.', publicSupport: 5, politicalCapital: -15 }
    ]
  },
  'exec_veto_threat': {
    id: 'exec_veto_threat',
    title: 'Executive Veto Threat',
    description: 'The Governor threatens to veto the luxury tax bill (with the yacht exemption) as "bad policy".',
    type: 'executive',
    choices: [
      { text: 'Dare the Governor to veto education funding on live TV.', nextState: 'end_success_brink', impactText: 'The Governor blinks and signs the bill to avoid bad press.', publicSupport: 20, politicalCapital: -20 },
      { text: 'Offer to amend the bill in a special session to appease the Governor.', nextState: 'end_fail', impactText: 'The momentum dies during the special session. The bill fails.', publicSupport: -20, politicalCapital: 5 }
    ]
  },
  'end_fail': {
    id: 'end_fail',
    title: 'Bill Defeated',
    description: 'Your legislative effort has failed. The education funding crisis continues unabated.',
    type: 'end',
    choices: []
  },
  'end_pass_narrow': {
    id: 'end_pass_narrow',
    title: 'Historic Victory!',
    description: 'Against all odds, your 15% funding increase (without loopholes) is signed into law. You are hailed as a champion of public education.',
    type: 'end',
    choices: []
  },
  'end_success_moderate': {
    id: 'end_success_moderate',
    title: 'Incremental Progress',
    description: 'The 5% increase becomes law. It\'s not what you hoped for, but it\'s better than nothing. You live to fight another day.',
    type: 'end',
    choices: []
  },
  'end_success_snub': {
    id: 'end_success_snub',
    title: 'Pyrrhic Victory',
    description: 'The 5% increase becomes law. However, you are now on the Governor\'s enemies list, making future legislation much harder.',
    type: 'end',
    choices: []
  },
  'end_success_brink': {
    id: 'end_success_brink',
    title: 'Hard-Fought Win',
    description: 'The bill becomes law after a tense standoff. You secured the funding, but the yacht exemption remains a blemish on the legislation.',
    type: 'end',
    choices: []
  }
};

export default function BillSimulator() {
  const [currentState, setCurrentState] = useState<string>('start');
  const [publicSupport, setPublicSupport] = useState<number>(50);
  const [politicalCapital, setPoliticalCapital] = useState<number>(50);
  const [history, setHistory] = useState<{scenario: string, choiceText: string, impact: string}[]>([]);

  const scenario = SCENARIOS[currentState];

  const handleChoice = (choice: Choice) => {
    setPublicSupport(prev => Math.max(0, Math.min(100, prev + choice.publicSupport)));
    setPoliticalCapital(prev => Math.max(0, Math.min(100, prev + choice.politicalCapital)));
    setHistory([...history, {
      scenario: scenario.title,
      choiceText: choice.text,
      impact: choice.impactText
    }]);
    setCurrentState(choice.nextState);
  };

  const resetSimulation = () => {
    setCurrentState('start');
    setPublicSupport(50);
    setPoliticalCapital(50);
    setHistory([]);
  };

  const getStageIcon = (type: string) => {
    switch (type) {
      case 'committee': return <BookOpen size={24} />;
      case 'floor': return <Landmark size={24} />;
      case 'executive': return <ShieldCheck size={24} />;
      case 'end': return <CheckCircle size={24} />;
      default: return <Landmark size={24} />;
    }
  };

  const getStageColor = (type: string) => {
    switch (type) {
      case 'committee': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'floor': return 'bg-indigo-100 text-indigo-600 border-indigo-200';
      case 'executive': return 'bg-rose-100 text-rose-600 border-rose-200';
      case 'end': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="rounded-[40px] border-[3px] border-slate-200 bg-white p-10 shadow-sm max-w-5xl mx-auto flex flex-col gap-8 min-h-[800px]">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <h2 className="flex items-center gap-3 text-4xl font-black tracking-tighter text-indigo-950">
            <Landmark size={40} className="text-indigo-600" />
            Bill Simulator
          </h2>
          <p className="mt-2 font-bold text-slate-400">Navigate the complex path of passing legislation. Every choice impacts your political standing.</p>
        </div>
        <div className="flex gap-4">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-center min-w-32 shadow-sm">
            <span className="block text-[10px] font-black tracking-widest uppercase text-emerald-600 mb-1">Public Support</span>
            <span className="text-3xl font-black text-emerald-700">{publicSupport}%</span>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-center min-w-32 shadow-sm">
            <span className="block text-[10px] font-black tracking-widest uppercase text-amber-600 mb-1">Political Capital</span>
            <span className="text-3xl font-black text-amber-700">{politicalCapital}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-10">
        <div className="flex-1 space-y-8">
          <AnimatePresence mode="popLayout">
            <motion.div 
              key={currentState}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`rounded-[32px] p-8 border-4 shadow-xl shadow-slate-200/50 ${getStageColor(scenario.type).replace('text-', 'shadow-')}`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${getStageColor(scenario.type)} bg-white shadow-sm`}>
                  {getStageIcon(scenario.type)}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
                    Phase: {scenario.type}
                  </h3>
                </div>
              </div>
              
              <h4 className="text-3xl font-black tracking-tight text-slate-900 mb-4">{scenario.title}</h4>
              <p className="text-lg font-bold text-slate-700 leading-relaxed mb-8 bg-white/50 p-6 rounded-2xl border border-white/40">
                {scenario.description}
              </p>

              {scenario.type !== 'end' ? (
                <div className="space-y-4 pt-4 border-t border-black/5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Your Strategic Options</h5>
                  {scenario.choices.map((choice, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleChoice(choice)}
                      className="w-full text-left bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-100/50 transition-all group flex items-start gap-4"
                    >
                      <div className="mt-1 h-6 w-6 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover:border-indigo-600 group-hover:bg-indigo-50">
                        <ArrowRight size={14} className="text-transparent group-hover:text-indigo-600 transition-colors" />
                      </div>
                      <div>
                        <span className="block text-sm font-black text-slate-800 group-hover:text-indigo-950">{choice.text}</span>
                        <div className="flex gap-4 mt-2">
                          <span className={`text-[10px] font-bold ${choice.publicSupport >= 0 ? 'text-emerald-600' : 'text-rose-600'} uppercase tracking-widest`}>
                            {choice.publicSupport > 0 ? '+' : ''}{choice.publicSupport} Public
                          </span>
                          <span className={`text-[10px] font-bold ${choice.politicalCapital >= 0 ? 'text-emerald-600' : 'text-rose-600'} uppercase tracking-widest`}>
                            {choice.politicalCapital > 0 ? '+' : ''}{choice.politicalCapital} Capital
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="pt-8 text-center border-t border-black/5">
                  <span className="block mb-6 text-6xl">{scenario.id === 'end_fail' ? '❌' : '🏆'}</span>
                  <button 
                    onClick={resetSimulation}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <RotateCcw size={18} />
                    PLAY AGAIN
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* History Log */}
        <div className="w-full lg:w-96 rounded-[32px] bg-slate-50 p-6 border-2 border-slate-100 flex flex-col max-h-[800px]">
          <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 px-2">
            <Mail size={16} /> Strategy Log
          </h4>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
            {history.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 text-center py-10 italic">
                Your political choices will be recorded here...
              </p>
            ) : (
              history.map((h, i) => (
                <div key={i} className="relative pl-6 pb-2 border-l-2 border-indigo-100 last:border-0 last:pb-0">
                  <div className="absolute left-[-5px] top-1 h-2 w-2 rounded-full bg-indigo-400 ring-4 ring-slate-50" />
                  <span className="block text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">{h.scenario}</span>
                  <p className="text-xs font-bold text-slate-700 italic border-l border-slate-200 pl-3 mb-2">{h.choiceText}</p>
                  <p className="text-xs font-black text-slate-500 bg-white border border-slate-200 rounded-lg p-2 shadow-sm">{h.impact}</p>
                </div>
              ))
            )}
            <div className="text-transparent pb-6">spacer</div>
          </div>
        </div>
      </div>
    </div>
  );
}
