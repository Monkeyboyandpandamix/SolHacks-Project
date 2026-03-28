import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { BarChart3, TrendingUp, Users, Landmark, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

const AnalyticsView: React.FC = () => {
  const categoryData = [
    { name: 'Housing', count: 12, impact: 85 },
    { name: 'Labor', count: 8, impact: 70 },
    { name: 'Education', count: 15, impact: 90 },
    { name: 'Health', count: 10, impact: 75 },
    { name: 'Environment', count: 6, impact: 60 },
    { name: 'Immigration', count: 4, impact: 40 },
  ];

  const sentimentData = [
    { name: 'Support', value: 65, color: '#10b981' },
    { name: 'Oppose', value: 25, color: '#f43f5e' },
    { name: 'Neutral', value: 10, color: '#94a3b8' },
  ];

  const activityData = [
    { month: 'Jan', bills: 4 },
    { month: 'Feb', bills: 7 },
    { month: 'Mar', bills: 12 },
    { month: 'Apr', bills: 9 },
    { month: 'May', bills: 15 },
    { month: 'Jun', bills: 11 },
  ];

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Legislative Analytics</h2>
          <p className="mt-2 font-bold text-slate-400">Data-driven insights into local and state legislation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Active Bills', value: '45', icon: <Landmark size={24} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'High Impact', value: '12', icon: <AlertCircle size={24} />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Community Participation', value: '8.2k', icon: <Users size={24} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Trend Velocity', value: '+24%', icon: <TrendingUp size={24} />, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="rounded-[32px] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50"
          >
            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
              {stat.icon}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
            <h3 className="text-3xl font-black text-indigo-950">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Category Distribution */}
        <div className="rounded-[40px] border-2 border-slate-100 bg-white p-10 shadow-xl shadow-slate-200/50">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-xl font-black text-indigo-950">Legislation by Category</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Community Sentiment */}
        <div className="rounded-[40px] border-2 border-slate-100 bg-white p-10 shadow-xl shadow-slate-200/50">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-black text-indigo-950">Community Sentiment</h3>
          </div>
          <div className="flex h-[300px] items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs font-black uppercase tracking-widest text-slate-500">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legislative Activity Over Time */}
        <div className="rounded-[40px] border-2 border-slate-100 bg-white p-10 shadow-xl shadow-slate-200/50 lg:col-span-2">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <TrendingUp size={24} />
            </div>
            <h3 className="text-xl font-black text-indigo-950">Legislative Activity Trend</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="bills" 
                  stroke="#e11d48" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#e11d48', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
