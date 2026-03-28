import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Users, Zap, BarChart3, Target } from 'lucide-react';

type RoadmapStatus = 'Implemented' | 'In Progress' | 'Planned';

interface RoadmapFeature {
  name: string;
  desc: string;
  status: RoadmapStatus;
}

interface RoadmapCategory {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  summary: string;
  features: RoadmapFeature[];
}

const categories: RoadmapCategory[] = [
  {
    title: 'AI-Enhanced Comprehension',
    icon: Sparkles,
    color: 'bg-indigo-600',
    summary: 'Use AI to simplify legal text, explain personal impact, and surface conflicts across jurisdictions.',
    features: [
      { name: 'Plain Language Summarizer', desc: 'AI condenses dense legal text into a 3-sentence plain English summary per law', status: 'Implemented' },
      { name: '"How Does This Affect Me?" Engine', desc: 'AI personalizes impact analysis based on your profile (homeowner, student, etc.)', status: 'Implemented' },
      { name: 'Side-by-Side Law Comparator', desc: 'Compare how the same issue is legislated across different states', status: 'Implemented' },
      { name: 'Conflict Detector', desc: 'AI flags when a state law potentially conflicts with a federal law', status: 'Implemented' },
      { name: 'Legal Jargon Glossary', desc: 'Inline definitions when hovering over complex legal terms', status: 'Implemented' },
    ],
  },
  {
    title: 'Civic Engagement & Action',
    icon: Target,
    color: 'bg-emerald-600',
    summary: 'Turn understanding into action with representative discovery, outreach tools, and legislative tracking.',
    features: [
      { name: 'AI Letter/Email Generator', desc: 'Drafts a personalized advocacy letter to your representative based on your stance', status: 'Implemented' },
      { name: 'Representative Finder', desc: 'Auto-populates elected officials based on your ZIP code via Google Civic API', status: 'Implemented' },
      { name: 'Voting Record Integration', desc: 'Shows how representatives voted on similar past bills via ProPublica API', status: 'Implemented' },
      { name: 'Legislative Status Tracker', desc: 'Visual bill progress bar: Introduced → Committee → Floor Vote → Signed/Vetoed', status: 'Implemented' },
      { name: 'Hearing Calendar', desc: 'Upcoming public hearings where citizens can testify with registration links', status: 'Implemented' },
    ],
  },
  {
    title: 'Community & Collaboration',
    icon: Users,
    color: 'bg-amber-500',
    summary: 'Build a civic community around each law with discussion, organizing, and shared evidence of impact.',
    features: [
      { name: 'Community Commentary', desc: 'Per-law threaded discussion board moderated by AI for civility', status: 'Implemented' },
      { name: 'Advocacy Groups Directory', desc: 'Orgs working on the same law — connect with them directly', status: 'Implemented' },
      { name: 'Collective Bookmarks', desc: 'Groups/coalitions can share curated law lists', status: 'Implemented' },
      { name: 'Crowd-sourced Impact Stories', desc: 'Citizens submit how a law affected them personally (verified, anonymized)', status: 'Implemented' },
    ],
  },
  {
    title: 'Intelligence & Discovery',
    icon: Zap,
    color: 'bg-rose-500',
    summary: 'Help users discover what matters next with proactive alerts, recommendations, accessibility, and trends.',
    features: [
      { name: 'Smart Alerts', desc: 'Notify users when bookmarked bills change status or new laws match interests', status: 'Implemented' },
      { name: 'Trending Laws Dashboard', desc: "What's being discussed most in your state this week", status: 'Implemented' },
      { name: 'Related Laws Recommendation', desc: 'Collaborative + content-based filtering ("Laws similar to this")', status: 'Implemented' },
      { name: 'Multi-language Support', desc: 'AI translation (Spanish, Mandarin, etc.) for accessibility', status: 'Implemented' },
      { name: 'Audio Summaries', desc: 'TTS (Text-to-Speech) for visually impaired or low-literacy users', status: 'Implemented' },
    ],
  },
  {
    title: 'Analytics & Transparency',
    icon: BarChart3,
    color: 'bg-cyan-500',
    summary: 'Expose campaign, sentiment, and forecasting data so organizers and power users can quantify momentum.',
    features: [
      { name: 'Advocacy Campaign Dashboard', desc: 'Track petition signatures, letters sent, views per law', status: 'Implemented' },
      { name: 'Sentiment Heatmap', desc: 'Geographic view of public sentiment on a law across counties', status: 'In Progress' },
      { name: 'Legislation Velocity Score', desc: 'AI predicts likelihood of a bill passing based on historical patterns', status: 'Implemented' },
    ],
  },
];

const RoadmapView: React.FC = () => {
  return (
    <div className="space-y-12">
      <div className="mb-10">
        <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Feature Roadmap</h2>
        <p className="mt-2 font-bold text-slate-400">Status reflects what is already in the product today.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-[32px] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Features</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-indigo-950">{categories.reduce((sum, category) => sum + category.features.length, 0)}</p>
        </div>
        <div className="rounded-[32px] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Implemented</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-emerald-600">{categories.reduce((sum, category) => sum + category.features.filter((feature) => feature.status === 'Implemented').length, 0)}</p>
        </div>
        <div className="rounded-[32px] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">In Progress</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-indigo-600">{categories.reduce((sum, category) => sum + category.features.filter((feature) => feature.status === 'In Progress').length, 0)}</p>
        </div>
        <div className="rounded-[32px] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Planned</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-slate-500">{categories.reduce((sum, category) => sum + category.features.filter((feature) => feature.status === 'Planned').length, 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {categories.map((category, idx) => (
          <motion.div key={category.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="rounded-[48px] border-2 border-slate-50 bg-white p-10 shadow-2xl shadow-slate-200/50">
            <div className="mb-8 flex items-center gap-6">
              <div className={`flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-xl ${category.color}`}>
                <category.icon size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-indigo-950">{category.title}</h3>
                <p className="mt-2 max-w-xl text-sm font-bold leading-relaxed text-slate-400">{category.summary}</p>
              </div>
            </div>

            <div className="space-y-4">
              {category.features.map((feature) => (
                <div key={feature.name} className="group relative rounded-[32px] border-2 border-transparent bg-slate-50 p-6 transition-all hover:border-indigo-600/10 hover:bg-white hover:shadow-xl hover:shadow-slate-200/30">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black text-indigo-950">{feature.name}</h4>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-slate-400">{feature.desc}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      feature.status === 'Implemented'
                        ? 'bg-emerald-100 text-emerald-700'
                        : feature.status === 'In Progress'
                          ? 'bg-indigo-100 text-indigo-600'
                          : 'bg-slate-200 text-slate-500'
                    }`}>
                      {feature.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RoadmapView;
