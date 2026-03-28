import React from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Globe, Twitter, Facebook, ExternalLink } from 'lucide-react';
import { Representative } from '../types';

interface RepresentativeCardProps {
  representative: Representative;
}

const RepresentativeCard: React.FC<RepresentativeCardProps> = ({ representative }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-[40px] bg-white p-8 shadow-xl shadow-slate-200/50 border-2 border-slate-50 transition-all hover:scale-[1.02] hover:border-indigo-600"
    >
      <div className="flex items-start gap-6">
        <div className="relative">
          <div className="h-24 w-24 overflow-hidden rounded-3xl bg-slate-100 border-4 border-white shadow-lg">
            {representative.photoUrl ? (
              <img 
                src={representative.photoUrl} 
                alt={representative.name} 
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <User size={40} />
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 rounded-xl bg-indigo-600 px-2 py-1 text-[8px] font-black text-white uppercase tracking-widest">
            {representative.party}
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-black tracking-tight text-indigo-950">{representative.name}</h3>
          <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{representative.office}</p>
          
          <div className="mt-6 flex flex-wrap gap-2">
            {representative.emails?.map((email, idx) => (
              <a 
                key={idx} 
                href={`mailto:${email}`}
                className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600"
              >
                <Mail size={14} />
                Email
              </a>
            ))}
            {representative.phones?.map((phone, idx) => (
              <a 
                key={idx} 
                href={`tel:${phone}`}
                className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600"
              >
                <Phone size={14} />
                Call
              </a>
            ))}
            {representative.urls?.map((url, idx) => (
              <a 
                key={idx} 
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600"
              >
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
            if (channel.type === 'Twitter') return <Twitter key={idx} size={18} className="text-slate-400 hover:text-sky-500 cursor-pointer transition-colors" />;
            if (channel.type === 'Facebook') return <Facebook key={idx} size={18} className="text-slate-400 hover:text-blue-600 cursor-pointer transition-colors" />;
            return null;
          })}
        </div>
        <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">
          View Voting Record
          <ExternalLink size={12} />
        </button>
      </div>
    </motion.div>
  );
};

export default RepresentativeCard;
