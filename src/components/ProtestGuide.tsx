import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, AlertTriangle, Info, CheckCircle, XCircle, ChevronRight, User, Heart, AlertCircle, RefreshCw } from 'lucide-react';

type GameState = 'START' | 'PREP' | 'ARRIVAL' | 'MARCH' | 'ENCOUNTER' | 'END';

interface GameEndState {
  title: string;
  message: string;
  isSuccess: boolean;
  culturalNote?: string;
}

export default function ProtestGuide() {
  const [activeTab, setActiveTab] = useState<'guide' | 'simulation'>('guide');
  
  // Game State
  const [gameState, setGameState] = useState<GameState>('START');
  const [endResult, setEndResult] = useState<GameEndState | null>(null);
  const [inventory, setInventory] = useState<string[]>([]);
  const [morale, setMorale] = useState(100);

  const resetGame = () => {
    setGameState('START');
    setEndResult(null);
    setInventory([]);
    setMorale(100);
  };

  const failGame = (title: string, message: string, culturalNote?: string) => {
    setEndResult({ title, message, isSuccess: false, culturalNote });
    setGameState('END');
  };

  const winGame = (title: string, message: string, culturalNote?: string) => {
    setEndResult({ title, message, isSuccess: true, culturalNote });
    setGameState('END');
  };

  // Render Guide
  const renderGuide = () => (
    <div className="space-y-12">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Peaceful Protest & Safety Guide</h2>
        <p className="mt-4 font-bold text-slate-500 max-w-2xl mx-auto">
          Your voice matters. Protesting is a fundamental right, but staying safe and protecting your community requires preparation. Use this guide to ensure you know your rights before taking to the streets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-[40px] bg-indigo-50 border-2 border-indigo-100 p-8 shadow-xl shadow-indigo-100/50">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <CheckCircle size={28} />
          </div>
          <h3 className="text-2xl font-black tracking-tighter text-indigo-950 mb-4">What To Bring</h3>
          <ul className="space-y-4 font-bold text-slate-700">
            <li className="flex gap-3"><span className="text-indigo-600">✓</span> Water in a plastic bottle</li>
            <li className="flex gap-3"><span className="text-indigo-600">✓</span> Valid ID and emergency cash</li>
            <li className="flex gap-3"><span className="text-indigo-600">✓</span> Snacks and basic first-aid supplies</li>
            <li className="flex gap-3"><span className="text-indigo-600">✓</span> Face mask or bandana (for safety and privacy)</li>
            <li className="flex gap-3"><span className="text-indigo-600">✓</span> Emergency contacts written on your arm</li>
          </ul>
        </div>

        <div className="rounded-[40px] bg-rose-50 border-2 border-rose-100 p-8 shadow-xl shadow-rose-100/50">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 text-white">
            <XCircle size={28} />
          </div>
          <h3 className="text-2xl font-black tracking-tighter text-rose-950 mb-4">What NOT To Bring</h3>
          <ul className="space-y-4 font-bold text-slate-700">
            <li className="flex gap-3"><span className="text-rose-600">✗</span> Weapons of any kind (or anything that could be construed as one)</li>
            <li className="flex gap-3"><span className="text-rose-600">✗</span> Anything you don't want to lose or get damaged</li>
            <li className="flex gap-3"><span className="text-rose-600">✗</span> Contact lenses (can trap tear gas/pepper spray)</li>
            <li className="flex gap-3"><span className="text-rose-600">✗</span> Unlocked phones or devices with biometric unlocks enabled</li>
          </ul>
        </div>

        <div className="md:col-span-2 rounded-[40px] bg-amber-50 border-2 border-amber-100 p-10 shadow-xl shadow-amber-100/50">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white">
            <ShieldCheck size={28} />
          </div>
          <h3 className="text-2xl font-black tracking-tighter text-amber-950 mb-4">Knowing Your Rights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            <div className="space-y-3">
              <h4 className="font-black text-amber-900 border-b-2 border-amber-200 pb-2">If Stopped by Police</h4>
              <p className="text-sm font-bold text-slate-700">Stay calm. Keep your hands visible. Ask: <em>"Am I free to go?"</em> If they say yes, walk away calmly. If they say no, ask <em>"Am I being detained?"</em> You have the right to remain silent.</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-black text-amber-900 border-b-2 border-amber-200 pb-2">Photography & Video</h4>
              <p className="text-sm font-bold text-slate-700">You have the right to record police in public spaces as long as you are not interfering with their duties. Do not hide your camera.</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-black text-amber-900 border-b-2 border-amber-200 pb-2">Immigration Status Concerns</h4>
              <p className="text-sm font-bold text-slate-700">You do not have to answer questions about your citizenship. Do not carry false documents. If ICE approaches you, assert your right to remain silent.</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-black text-amber-900 border-b-2 border-amber-200 pb-2">Dispersal Orders</h4>
              <p className="text-sm font-bold text-slate-700">If police announce an assembly is unlawful, leave peacefully through an available exit to avoid arrest. Note the officer's badges or vehicles if feasible.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Simulation Engine
  const renderSimulation = () => {
    return (
      <div className="max-w-4xl mx-auto w-full bg-slate-900 rounded-[40px] p-8 md:p-12 shadow-2xl text-white min-h-[600px] flex flex-col relative overflow-hidden">
        {/* Game Header */}
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50">
              <User className="text-indigo-400" />
            </div>
            <div>
              <h3 className="font-black text-xl tracking-wide">Juan's Journey</h3>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Interactive Simulation</p>
            </div>
          </div>
          {gameState !== 'START' && gameState !== 'END' && (
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 mb-1">MORALE</span>
                <div className="flex items-center gap-2 text-rose-400">
                  <Heart size={16} fill="currentColor" />
                  <span className="font-black text-sm">{morale}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {gameState === 'START' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col justify-center items-center text-center space-y-8"
            >
              <div className="h-24 w-24 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-4">
                <AlertTriangle size={48} className="text-white" />
              </div>
              <div>
                <h2 className="text-4xl font-black mb-4">The City Hall Protest</h2>
                <p className="text-slate-400 max-w-lg mx-auto font-medium leading-relaxed">
                  You play as <strong>Juan</strong>, a 22-year-old student. Following recent municipal changes affecting community housing, a massive protest has been organized downtown. His parents immigrated to the US, and he knows police encounters carry extra risks in his neighborhood.
                </p>
              </div>
              <button 
                onClick={() => setGameState('PREP')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                Start Preparation
              </button>
            </motion.div>
          )}

          {gameState === 'PREP' && (
            <motion.div
              key="prep"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-center"
            >
              <h3 className="text-2xl font-black text-amber-400 mb-2">Scene 1: Packing Up</h3>
              <p className="text-slate-300 font-medium mb-8 leading-relaxed text-lg">
                It's 10:00 AM. The march starts in an hour. Juan is staring at his backpack. He wants to be ready for anything, but knows counter-protesters might be aggressive. What should he bring?
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    setInventory(['water', 'id', 'marker']);
                    setGameState('ARRIVAL');
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">Pack water, ID, a Sharpie (for emergency contacts), and wear a face mask.</span>
                  <ChevronRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => {
                    failGame(
                      "Escalation Before Arrival", 
                      "Carrying a pocket knife to a protest is extremely dangerous. When police stopped the group at a checkpoint, Juan was searched and arrested for carrying a concealed weapon at a public demonstration.",
                      "For communities of color, implicit bias means carrying any item that could be considered a weapon significantly increases the risk of police violence or harsh charging."
                    );
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">Pack his pocket knife for self-defense, just in case things get rough.</span>
                  <ChevronRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => {
                    setInventory(['nothing']);
                    setGameState('ARRIVAL');
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">Bring nothing. Just his phone (with FaceID enabled) and keys. Keep it light.</span>
                  <ChevronRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'ARRIVAL' && (
            <motion.div
              key="arrival"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-center"
            >
              <h3 className="text-2xl font-black text-amber-400 mb-2">Scene 2: The Gathering</h3>
              <p className="text-slate-300 font-medium mb-8 leading-relaxed text-lg">
                Juan arrives at City Hall. The crowd is huge and energetic. Suddenly, a small group of hostile counter-protesters approaches, yelling slurs and trying to block the marchers. One gets right in Juan's face.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    failGame(
                      "Violence Erupts", 
                      "Juan shoved the man back. Instantly, a scuffle broke out. Police standing nearby immediately detained Juan, blaming him for instigating the violence.",
                      "Agitators often provoke protesters to undermine the peaceful nature of the event. Engaging physically almost always results in police intervention targeting the protesters."
                    );
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">Shove the man away to protect personal space.</span>
                  <ChevronRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => {
                    setMorale(m => m - 10);
                    setGameState('MARCH');
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">Ignore him, link arms with fellow organizers, and start a loud chant to drown him out.</span>
                  <ChevronRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => {
                    setMorale(m => m - 30);
                    setGameState('MARCH');
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">Argue back passionately but verbally to defend his community's honor.</span>
                  <ChevronRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'MARCH' && (
            <motion.div
              key="march"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-center"
            >
              <h3 className="text-2xl font-black text-amber-400 mb-2">Scene 3: The Blockade</h3>
              <p className="text-slate-300 font-medium mb-8 leading-relaxed text-lg">
                The march proceeds peacefully, but police in riot gear have formed a line blocking the main intersection. A loudspeaker crackles: <em>"This is an unlawful assembly. Disperse immediately or you will be subject to arrest and use of force."</em> Juan doesn't fully hear the dispersal route over the noise.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    if (inventory.includes('nothing')) {
                      failGame(
                        "Confiscated Devices", 
                        "Juan stayed to document, but police kettled (surrounded) the group. Without ID and having a phone with biometric unlock (FaceID), police easily accessed his device during processing before he could call a lawyer.",
                        "Disabling biometric unlock (using a passcode instead) protects your digital privacy during detentions."
                      );
                    } else {
                      setGameState('ENCOUNTER');
                    }
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">Stay at the front line with his phone out, demanding the police let them pass peacefully.</span>
                  <ChevronRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => {
                    failGame(
                      "Dangerous Escalation", 
                      "Juan picked up an empty water bottle and tossed it toward the police line. Instantly, police fired tear gas and moved in aggressively. Juan was charged with assaulting an officer.",
                      "Any projectile thrown gives law enforcement legal pretext to declare a riot and use chemical weapons on the entire crowd."
                    );
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">Throw an empty water bottle at the police barricade to show frustration.</span>
                  <ChevronRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => {
                    winGame(
                      "Safety First", 
                      "Juan turned to his group, passed along the message to stay calm, and slowly walked away from the police line using an open side street.",
                      "Dispersal orders must legally provide a clear exit route. Leaving slowly without running prevents panic and protects you from lawful arrest."
                    );
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">Encourage others to remain calm and slowly walk back toward the nearest unblocked exit.</span>
                  <ChevronRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'ENCOUNTER' && (
            <motion.div
              key="encounter"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-center"
            >
              <h3 className="text-2xl font-black text-amber-400 mb-2">Scene 4: The Detention</h3>
              <p className="text-slate-300 font-medium mb-8 leading-relaxed text-lg">
                Juan chose to stay. The police advance and grab him, pulling him behind their line. An officer yells aggressive questions at him. Two other officers approach, and Juan is terrified about implications for his undocumented parents if he gets officially booked.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    failGame(
                      "Resisting Arrest", 
                      "Juan panicked and tried to pull his arms away. The officers tackled him to the ground, resulting in injuries and adding 'Resisting Arrest' to his charges.",
                      "Never pull away or run from an officer, even if the arrest is unlawful. Fight it in court, not on the street."
                    );
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">Yank his arm away and try to sprint back into the crowd.</span>
                  <ChevronRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => {
                    winGame(
                      "Exercising Rights", 
                      "Juan took a deep breath. He clearly stated, 'I am not resisting. Am I free to go, or am I being detained? I invoke my right to remain silent.' The officers cuffed him and cited him, but the interaction de-escalated and he was released hours later thanks to the emergency contacts written in Sharpie on his arm.",
                      "Asserting your rights respectfully but firmly is the best legal defense. For mixed-status families, minimizing the severity of charges by not resisting is crucial to avoiding severe immigration consequences later."
                    );
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">Keep hands visible, don't resist, and assert: "Am I being detained? I have the right to remain silent."</span>
                  <ChevronRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => {
                    failGame(
                      "Incriminating Statements", 
                      "Juan tried to explain his situation, nervously giving out more information about his family's neighborhood and his own actions. The police used this to justify detaining him longer for 'investigation'.",
                      "Never try to talk your way out of an arrest. Anything you say can and will be used against you. The only thing you should say is that you wish to remain silent and want a lawyer."
                    );
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">Rapidly try to explain that he was just standing there and talk his way out of the cuffs.</span>
                  <ChevronRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'END' && endResult && (
            <motion.div
              key="end"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col justify-center items-center text-center space-y-6"
            >
              <div className={`h-24 w-24 rounded-3xl flex items-center justify-center shadow-lg mb-4 ${endResult.isSuccess ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-rose-600 shadow-rose-600/30'}`}>
                {endResult.isSuccess ? <CheckCircle size={48} className="text-white" /> : <XCircle size={48} className="text-white" />}
              </div>
              <h2 className="text-4xl font-black">{endResult.title}</h2>
              <p className="text-slate-300 max-w-xl text-lg leading-relaxed">
                {endResult.message}
              </p>
              
              {endResult.culturalNote && (
                <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 max-w-2xl mt-6 text-left w-full flex gap-4">
                  <Info className="text-amber-400 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-black text-amber-400 uppercase tracking-widest text-xs mb-2">Cultural Context</h4>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">{endResult.culturalNote}</p>
                  </div>
                </div>
              )}

              <button 
                onClick={resetGame}
                className="mt-8 flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg hover:shadow-xl hover:bg-slate-100"
              >
                <RefreshCw size={18} />
                Try Another Path
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {/* Tabs */}
      <div className="flex bg-slate-100 p-2 rounded-3xl mx-auto max-w-xl relative">
        <button
          onClick={() => setActiveTab('guide')}
          className={`flex-1 py-4 text-sm font-black tracking-widest uppercase transition-all z-10 rounded-2xl ${activeTab === 'guide' ? 'text-indigo-950' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          Protest Guide
        </button>
        <button
          onClick={() => setActiveTab('simulation')}
          className={`flex-1 py-4 text-sm font-black tracking-widest uppercase transition-all z-10 rounded-2xl ${activeTab === 'simulation' ? 'text-indigo-950' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          Interactive Simulation
        </button>
        
        {/* Animated Background */}
        <div className="absolute inset-2 z-0 flex">
          <motion.div 
            className="w-1/2 bg-white rounded-2xl shadow-sm border border-slate-200"
            initial={false}
            animate={{ 
              x: activeTab === 'guide' ? '0%' : '100%'
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'guide' ? (
          <motion.div
            key="guide-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderGuide()}
          </motion.div>
        ) : (
          <motion.div
            key="simulation-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderSimulation()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
