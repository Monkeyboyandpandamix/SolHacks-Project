import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Clock, Landmark, Scale, ArrowRight, BookOpen, AlertCircle, Building2 } from 'lucide-react';

interface NodeInfo {
  id: string;
  title: string;
  type: 'precedent' | 'proposal' | 'amendment' | 'current' | 'challenge';
  date: string;
  description: string;
  status: string;
}

export default function LawWorkflow() {
  const [selectedNode, setSelectedNode] = useState<string | null>('n4');

  const nodes: NodeInfo[] = [
    {
      id: 'n1',
      title: 'Zoning Ordinance 1999',
      type: 'precedent',
      date: 'Oct 1999',
      description: 'Historical precedent establishing commercial and residential zoning boundaries. Allowed for localized variances through city planning appeals.',
      status: 'Active Precedent'
    },
    {
      id: 'n2',
      title: 'Housing Expansion Proposal (Prop C)',
      type: 'proposal',
      date: 'Jan 2024',
      description: 'Initial proposal drafted to modify the 1999 Ordinance to allow high-density housing in commercial zones to address the housing crisis.',
      status: 'Superseded'
    },
    {
      id: 'n3',
      title: 'Committee Amendment 24A',
      type: 'amendment',
      date: 'Mar 2024',
      description: 'City Planning Committee introduces an amendment restricting high-density buildings to areas within 0.5 miles of major transit hubs.',
      status: 'Passed'
    },
    {
      id: 'n4',
      title: 'Comprehensive Transit-Oriented Development Act',
      type: 'current',
      date: 'Jun 2024',
      description: 'The finalized and enacted law integrating Prop C and Amendment 24A. Overrides conflicting sections of the 1999 Ordinance.',
      status: 'Current Law'
    },
    {
      id: 'n5',
      title: 'Pending Legal Challenge - Smith v. City Council',
      type: 'challenge',
      date: 'Pending 2025',
      description: 'A neighborhood coalition challenges the environmental review process of the new housing developments under the enacted law.',
      status: 'In Court'
    }
  ];

  const getNodeIcon = (type: string) => {
    switch(type) {
      case 'precedent': return <Scale size={20} />;
      case 'proposal': return <BookOpen size={20} />;
      case 'amendment': return <Share2 size={20} />;
      case 'challenge': return <AlertCircle size={20} />;
      case 'current': return <Landmark size={20} />;
      default: return <Building2 size={20} />;
    }
  };

  const getColors = (type: string, isSelected: boolean) => {
    if (isSelected) return 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200';
    switch(type) {
      case 'precedent': return 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400';
      case 'proposal': return 'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400';
      case 'amendment': return 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-400';
      case 'current': return 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:border-indigo-400';
      case 'challenge': return 'bg-rose-50 border-rose-200 text-rose-700 hover:border-rose-400';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const selectedData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

  return (
    <div className="rounded-[40px] border-[3px] border-slate-200 bg-white p-10 shadow-sm min-h-[800px] flex flex-col xl:flex-row gap-12">
      <div className="flex-1">
        <div className="mb-10">
          <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Law Workflow & Precedence</h2>
          <p className="mt-2 font-bold text-slate-400">Trace the evolutionary path of legislation, from foundational precedents to current enactments and pending challenges.</p>
        </div>

        <div className="relative pt-8 pl-8">
          <div className="absolute left-16 top-16 bottom-16 w-1 rounded-full bg-slate-100" />
          
          <div className="space-y-12">
            {nodes.map((node, index) => {
              const isSelected = selectedNode === node.id;
              return (
                <div key={node.id} className="relative flex items-center gap-8">
                  {/* Connector line for workflow */}
                  <div className={`absolute left-8 h-8 w-8 rounded-full border-4 flex items-center justify-center transition-all z-10 ${isSelected ? 'border-indigo-600 bg-white shadow-md' : 'border-slate-200 bg-white'}`}>
                    <div className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                  </div>
                  
                  <div className="pl-20 w-full">
                    <button 
                      onClick={() => setSelectedNode(node.id)}
                      className={`w-full max-w-lg text-left p-6 rounded-3xl border-2 transition-all ${getColors(node.type, isSelected)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                            {getNodeIcon(node.type)}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                            {node.type}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                          <Clock size={12} />
                          {node.date}
                        </span>
                      </div>
                      <h3 className="text-lg font-black leading-tight mb-2">{node.title}</h3>
                      {index < nodes.length - 1 && (
                        <div className="absolute left-8 top-full h-12 w-8 flex items-center justify-center -translate-x-1/2">
                          <ArrowRight size={20} className="text-slate-200 rotate-90" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {selectedData && (
          <motion.div 
            key={selectedData.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full xl:w-96 rounded-[32px] bg-slate-50 p-8 border-2 border-slate-100 h-fit sticky top-32"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-50">
                {getNodeIcon(selectedData.type)}
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-indigo-900">Node Details</h4>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{selectedData.status}</p>
              </div>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-6 leading-tight">{selectedData.title}</h3>
            
            <div className="mb-8">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description & Impact</h5>
              <p className="text-sm font-bold text-slate-700 leading-relaxed">{selectedData.description}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Scale size={14} /> Legal Precedence
              </h5>
              <p className="text-xs font-bold text-slate-600">
                {selectedData.type === 'current' ? 
                  "This is the active law. It supersedes older proposals but remains bound by the state constitution and prior supreme court precedents." : 
                 selectedData.type === 'precedent' ? 
                  "Historical foundational text. Future rulings often defer to the framework established here unless explicitly updated." :
                  "Interim stage legislation affecting the final draft but not holding ultimate legal authority."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
