import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Users, 
  Zap, 
  BarChart3, 
  Target
} from 'lucide-react';

type RoadmapStatus = 'Planned' | 'In Progress';

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

const RoadmapView: React.FC = () => {
  const categories: RoadmapCategory[] = [
    {
      title: "AI-Enhanced Comprehension",
      icon: Sparkles,
      color: "bg-indigo-600",
      summary: "Use AI to simplify legal text, explain personal impact, and surface conflicts across jurisdictions.",
      features: [
        { name: "Plain Language Summarizer", desc: "AI condenses dense legal text into a 3-sentence plain English summary per law", status: "Planned" },
        { name: "\"How Does This Affect Me?\" Engine", desc: "AI personalizes impact analysis based on your profile (homeowner, student, etc.)", status: "Planned" },
        { name: "Side-by-Side Law Comparator", desc: "Compare how the same issue is legislated across different states", status: "In Progress" },
        { name: "Conflict Detector", desc: "AI flags when a state law potentially conflicts with a federal law", status: "Planned" },
        { name: "Legal Jargon Glossary", desc: "Inline definitions when hovering over complex legal terms", status: "Planned" }
      ]
    },
    {
      title: "Civic Engagement & Action",
      icon: Target,
      color: "bg-emerald-600",
      summary: "Turn understanding into action with representative discovery, outreach tools, and legislative tracking.",
      features: [
        { name: "AI Letter/Email Generator", desc: "Drafts a personalized advocacy letter to your representative based on your stance", status: "Planned" },
        { name: "Representative Finder", desc: "Auto-populates elected officials based on your ZIP code via Google Civic API", status: "Planned" },
        { name: "Voting Record Integration", desc: "Shows how representatives voted on similar past bills via ProPublica API", status: "Planned" },
        { name: "Legislative Status Tracker", desc: "Visual bill progress bar: Introduced → Committee → Floor Vote → Signed/Vetoed", status: "Planned" },
        { name: "Hearing Calendar", desc: "Upcoming public hearings where citizens can testify with registration links", status: "Planned" }
      ]
    },
    {
      title: "Community & Collaboration",
      icon: Users,
      color: "bg-amber-500",
      summary: "Build a civic community around each law with discussion, organizing, and shared evidence of impact.",
      features: [
        { name: "Community Commentary", desc: "Per-law threaded discussion board moderated by AI for civility", status: "Planned" },
        { name: "Advocacy Groups Directory", desc: "Orgs working on the same law — connect with them directly", status: "Planned" },
        { name: "Collective Bookmarks", desc: "Groups/coalitions can share curated law lists", status: "Planned" },
        { name: "Crowd-sourced Impact Stories", desc: "Citizens submit how a law affected them personally (verified, anonymized)", status: "Planned" }
      ]
    },
    {
      title: "Intelligence & Discovery",
      icon: Zap,
      color: "bg-rose-500",
      summary: "Help users discover what matters next with proactive alerts, recommendations, accessibility, and trends.",
      features: [
        { name: "Smart Alerts", desc: "Notify users when bookmarked bills change status or new laws match interests", status: "Planned" },
        { name: "Trending Laws Dashboard", desc: "What's being discussed most in your state this week", status: "Planned" },
        { name: "Related Laws Recommendation", desc: "Collaborative + content-based filtering (\"Laws similar to this\")", status: "Planned" },
        { name: "Multi-language Support", desc: "AI translation (Spanish, Mandarin, etc.) for accessibility", status: "Planned" },
        { name: "Audio Summaries", desc: "TTS (Text-to-Speech) for visually impaired or low-literacy users", status: "Planned" }
      ]
    },
    {
      title: "Analytics & Transparency",
      icon: BarChart3,
      color: "bg-cyan-500",
      summary: "Expose campaign, sentiment, and forecasting data so organizers and power users can quantify momentum.",
      features: [
        { name: "Advocacy Campaign Dashboard", desc: "Track petition signatures, letters sent, views per law", status: "Planned" },
        { name: "Sentiment Heatmap", desc: "Geographic view of public sentiment on a law across counties", status: "Planned" },
        { name: "Legislation Velocity Score", desc: "AI predicts likelihood of a bill passing based on historical patterns", status: "Planned" }
      ]
    }
  ];

  return (
    <div className="space-y-12">
      <div className="mb-10">
        <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Feature Roadmap</h2>
        <p className="mt-2 font-bold text-slate-400">Our vision for the future of CivicLens. Help us prioritize by voting on features.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-[32px] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Features</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-indigo-950">
            {categories.reduce((sum, category) => sum + category.features.length, 0)}
          </p>
        </div>
        <div className="rounded-[32px] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">In Progress</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-indigo-600">
            {categories.reduce((sum, category) => sum + category.features.filter(feature => feature.status === 'In Progress').length, 0)}
          </p>
        </div>
        <div className="rounded-[32px] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Planned</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-slate-500">
            {categories.reduce((sum, category) => sum + category.features.filter(feature => feature.status === 'Planned').length, 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {categories.map((category, idx) => (
          <motion.div 
            key={category.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="rounded-[48px] bg-white p-10 shadow-2xl shadow-slate-200/50 border-2 border-slate-50"
          >
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
                <div 
                  key={feature.name}
                  className="group relative rounded-[32px] bg-slate-50 p-6 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/30 border-2 border-transparent hover:border-indigo-600/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black text-indigo-950">{feature.name}</h4>
                      <p className="mt-1 text-xs font-bold text-slate-400 leading-relaxed">{feature.desc}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      feature.status === 'In Progress'
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

      <div className="rounded-[60px] bg-indigo-950 p-16 text-center text-white shadow-2xl shadow-indigo-200">
        <Sparkles className="mx-auto mb-8 text-indigo-400" size={64} />
        <h3 className="text-4xl font-black tracking-tighter">Have a suggestion?</h3>
        <p className="mx-auto mt-4 max-w-2xl text-lg font-bold text-indigo-200/60">
          CivicLens is built for the community. If you have an idea for a feature that would help you stay more engaged with your local government, we want to hear it.
        </p>
        <button className="mt-10 rounded-3xl bg-white px-10 py-5 text-sm font-black text-indigo-950 shadow-xl transition-all hover:scale-105 active:scale-95">
          SUBMIT FEATURE REQUEST
        </button>
      </div>
    </div>
  );
};

export default RoadmapView;
