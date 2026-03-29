import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Globe, Twitter, Facebook, ChevronDown, ChevronUp } from 'lucide-react';
import { Representative } from '../types';

interface RepresentativeCardProps {
  representative: Representative;
}

const RepresentativeCard: React.FC<RepresentativeCardProps> = ({ representative }) => {
  const [showVotingRecord, setShowVotingRecord] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="group relative overflow-hidden rounded-[40px] border-2 border-slate-50 bg-white p-8 shadow-xl shadow-slate-200/50 transition-all hover:scale-[1.02] hover:border-indigo-600">
      <div className="flex items-start gap-6">
        <div className="relative">
          <div className="h-24 w-24 overflow-hidden rounded-3xl border-4 border-white bg-slate-100 shadow-lg">
            {representative.photoUrl ? (
              <img src={representative.photoUrl} alt={representative.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <User size={40} />
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 rounded-xl bg-indigo-600 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white">
            {representative.party}
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-black tracking-tight text-indigo-950">{representative.name}</h3>
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">{representative.office || representative.role}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {representative.emails?.map((email, idx) => (
              <a key={idx} href={email.startsWith('http') ? email : `mailto:${email}`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600">
                <Mail size={14} />
                Email
              </a>
            ))}
            {representative.phones?.map((phone, idx) => (
              <a key={idx} href={`tel:${phone}`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600">
                <Phone size={14} />
                Call
              </a>
            ))}
            {representative.urls?.map((url, idx) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600">
                <Globe size={14} />
                Website
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-slate-50 pt-6">
        <div className="flex gap-4">
          {representative.channels?.map((channel, idx) => {
            if (channel.type === 'Twitter') return <Twitter key={idx} size={18} className="cursor-pointer text-slate-400 transition-colors hover:text-sky-500" />;
            if (channel.type === 'Facebook') return <Facebook key={idx} size={18} className="cursor-pointer text-slate-400 transition-colors hover:text-blue-600" />;
            return null;
          })}
        </div>
        {representative.votingRecord && representative.votingRecord.length > 0 && (
          <button
            onClick={() => setShowVotingRecord((prev) => !prev)}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-indigo-600 transition hover:bg-indigo-50"
          >
            Voting record snapshot
            {showVotingRecord ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {representative.votingRecord && representative.votingRecord.length > 0 && showVotingRecord && (
        <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voting Record Snapshot</p>
          <div className="mt-4 space-y-3">
            {representative.votingRecord.map((record) => (
              <div key={record.billTitle} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-black text-slate-900">{record.billTitle}</p>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                    record.stance === 'support' ? 'bg-emerald-100 text-emerald-700' : record.stance === 'oppose' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {record.stance}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-bold leading-relaxed text-slate-500">{record.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!representative.votingRecord || representative.votingRecord.length === 0) && (
        <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voting Record Snapshot</p>
          <p className="mt-3 text-[11px] font-bold leading-relaxed text-slate-500">
            Recent official voting history is not available for this representative yet.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default RepresentativeCard;
