import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { BarChart3, TrendingUp, Users, Landmark, AlertCircle } from 'lucide-react';
import { BookmarkCollection, Law } from '../types';

interface AnalyticsViewProps {
  laws: Law[];
  collections: BookmarkCollection[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ laws, collections }) => {
  const categoryData = Object.values(laws.reduce((acc, law) => {
    acc[law.category] = {
      name: law.category,
      count: (acc[law.category]?.count || 0) + 1,
      impact: Math.max(acc[law.category]?.impact || 0, law.velocityScore || 0),
    };
    return acc;
  }, {} as Record<string, { name: string; count: number; impact: number }>));

  const totalSupport = laws.reduce((sum, law) => sum + (law.votes?.support || 0), 0);
  const totalOppose = laws.reduce((sum, law) => sum + (law.votes?.oppose || 0), 0);
  const sentimentData = [
    { name: 'Support', value: totalSupport || 1, color: '#10b981' },
    { name: 'Oppose', value: totalOppose || 1, color: '#f43f5e' },
    { name: 'Watching', value: Math.max(laws.length * 10 - totalSupport - totalOppose, 1), color: '#94a3b8' },
  ];

  const activityData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => ({
    month,
    bills: Math.max(1, Math.round((laws.reduce((sum, law) => sum + (law.velocityScore || 40), 0) / Math.max(laws.length, 1)) / 10) + index),
  }));

  const activeBills = laws.length;
  const highImpact = laws.filter((law) => (law.velocityScore || 0) >= 75).length;
  const communityParticipation = laws.reduce((sum, law) => sum + (law.comments?.length || 0) + (law.impactStories?.length || 0), 0);
  const averageVelocity = laws.length > 0 ? Math.round(laws.reduce((sum, law) => sum + (law.velocityScore || 0), 0) / laws.length) : 0;
  const heatmapData = [
    { region: 'Federal', sentiment: Math.round((laws.filter((law) => law.level === 'federal').reduce((sum, law) => sum + ((law.votes?.support || 0) - (law.votes?.oppose || 0)), 0)) / Math.max(laws.filter((law) => law.level === 'federal').length, 1)) || 0 },
    { region: 'State', sentiment: Math.round((laws.filter((law) => law.level === 'state').reduce((sum, law) => sum + ((law.votes?.support || 0) - (law.votes?.oppose || 0)), 0)) / Math.max(laws.filter((law) => law.level === 'state').length, 1)) || 0 },
    { region: 'Local', sentiment: Math.round((laws.filter((law) => law.level === 'city' || law.level === 'county').reduce((sum, law) => sum + ((law.votes?.support || 0) - (law.votes?.oppose || 0)), 0)) / Math.max(laws.filter((law) => law.level === 'city' || law.level === 'county').length, 1)) || 0 },
  ];

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Legislative Analytics</h2>
          <p className="mt-2 font-bold text-slate-400">Live campaign, sentiment, and velocity metrics derived from your current feed.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Active Bills', value: String(activeBills), icon: <Landmark size={24} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'High Impact', value: String(highImpact), icon: <AlertCircle size={24} />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Community Participation', value: String(communityParticipation), icon: <Users size={24} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Trend Velocity', value: String(averageVelocity), icon: <TrendingUp size={24} />, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="rounded-[32px] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>{stat.icon}</div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
            <h3 className="text-3xl font-black text-indigo-950">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-[40px] border-2 border-slate-100 bg-white p-10 shadow-xl shadow-slate-200/50">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><BarChart3 size={24} /></div>
            <h3 className="text-xl font-black text-indigo-950">Legislation by Category</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[40px] border-2 border-slate-100 bg-white p-10 shadow-xl shadow-slate-200/50">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Users size={24} /></div>
            <h3 className="text-xl font-black text-indigo-950">Community Sentiment</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={8} dataKey="value">
                  {sentimentData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[40px] border-2 border-slate-100 bg-white p-10 shadow-xl shadow-slate-200/50">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600"><Users size={24} /></div>
            <h3 className="text-xl font-black text-indigo-950">Sentiment Heatmap</h3>
          </div>
          <div className="space-y-4">
            {heatmapData.map((item) => (
              <div key={item.region}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">{item.region}</p>
                  <p className="text-xs font-black text-indigo-600">{item.sentiment}</p>
                </div>
                <div className="h-4 rounded-full bg-slate-100">
                  <div className="h-4 rounded-full bg-indigo-600" style={{ width: `${Math.min(100, Math.max(10, Math.abs(item.sentiment) + 20))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[40px] border-2 border-slate-100 bg-white p-10 shadow-xl shadow-slate-200/50">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600"><Landmark size={24} /></div>
            <h3 className="text-xl font-black text-indigo-950">Advocacy Campaign Dashboard</h3>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bookmark Collections</p>
              <p className="mt-2 text-3xl font-black text-indigo-950">{collections.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Letters & Actions Ready</p>
              <p className="mt-2 text-3xl font-black text-indigo-950">{laws.filter((law) => law.status === 'proposed').length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Community Stories</p>
              <p className="mt-2 text-3xl font-black text-indigo-950">{laws.reduce((sum, law) => sum + (law.impactStories?.length || 0), 0)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[40px] border-2 border-slate-100 bg-white p-10 shadow-xl shadow-slate-200/50 lg:col-span-2">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><TrendingUp size={24} /></div>
            <h3 className="text-xl font-black text-indigo-950">Legislative Activity Trend</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip />
                <Line type="monotone" dataKey="bills" stroke="#e11d48" strokeWidth={4} dot={{ r: 6, fill: '#e11d48', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
