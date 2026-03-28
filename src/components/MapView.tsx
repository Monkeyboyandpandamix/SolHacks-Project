import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Info, ArrowRight, Building2, Landmark, Map as MapIcon } from 'lucide-react';
import { Law } from '../types';

interface MapViewProps {
  laws: Law[];
  onSelectLaw: (law: Law) => void;
}

const MapView: React.FC<MapViewProps> = ({ laws, onSelectLaw }) => {
  const [selectedRegion, setSelectedRegion] = useState<'federal' | 'state' | 'local' | null>(null);

  const regions = [
    { id: 'federal', name: 'Federal', icon: Landmark, color: 'bg-indigo-600', count: laws.filter(l => l.level === 'federal').length },
    { id: 'state', name: 'State', icon: Building2, color: 'bg-emerald-600', count: laws.filter(l => l.level === 'state').length },
    { id: 'local', name: 'Local', icon: MapPin, color: 'bg-amber-500', count: laws.filter(l => l.level === 'city' || l.level === 'county').length },
  ];

  return (
    <div className="space-y-12">
      <div className="mb-10">
        <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Map View</h2>
        <p className="mt-2 font-bold text-slate-400">Visualize legislative activity across different jurisdictions.</p>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Interactive Map Placeholder */}
        <div className="relative aspect-square rounded-[60px] bg-slate-50 p-12 border-4 border-white shadow-2xl shadow-slate-200/50 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <MapIcon size={600} className="absolute -right-20 -bottom-20 rotate-12" />
          </div>
          
          <div className="relative z-10 flex h-full flex-col items-center justify-center">
            <motion.div 
              className="relative h-64 w-64"
              animate={{ rotate: [0, 5, 0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
            >
              {/* Federal Circle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => setSelectedRegion('federal')}
                className={`absolute left-1/2 top-0 -translate-x-1/2 rounded-full p-8 shadow-2xl transition-all ${selectedRegion === 'federal' ? 'bg-indigo-600 text-white ring-8 ring-indigo-100' : 'bg-white text-indigo-600'}`}
              >
                <Landmark size={48} />
              </motion.button>

              {/* State Circle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => setSelectedRegion('state')}
                className={`absolute bottom-0 left-0 rounded-full p-8 shadow-2xl transition-all ${selectedRegion === 'state' ? 'bg-emerald-600 text-white ring-8 ring-emerald-100' : 'bg-white text-emerald-600'}`}
              >
                <Building2 size={48} />
              </motion.button>

              {/* Local Circle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => setSelectedRegion('local')}
                className={`absolute bottom-0 right-0 rounded-full p-8 shadow-2xl transition-all ${selectedRegion === 'local' ? 'bg-amber-500 text-white ring-8 ring-amber-100' : 'bg-white text-amber-600'}`}
              >
                <MapPin size={48} />
              </motion.button>

              {/* Connection Lines */}
              <svg className="absolute inset-0 -z-10 h-full w-full opacity-20" viewBox="0 0 100 100">
                <line x1="50" y1="20" x2="20" y2="80" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                <line x1="50" y1="20" x2="80" y2="80" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                <line x1="20" y1="80" x2="80" y2="80" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
              </svg>
            </motion.div>

            <div className="mt-12 text-center">
              <p className="text-sm font-black uppercase tracking-widest text-slate-400">Select a Jurisdiction</p>
              <p className="mt-2 text-xs font-bold text-slate-400">Click a node to see laws in that area</p>
            </div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="space-y-8">
          {selectedRegion ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-6">
                <div className={`flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-xl ${regions.find(r => r.id === selectedRegion)?.color}`}>
                  {React.createElement(regions.find(r => r.id === selectedRegion)!.icon, { size: 32 })}
                </div>
                <div>
                  <h3 className="text-3xl font-black tracking-tight text-indigo-950">{regions.find(r => r.id === selectedRegion)?.name} Jurisdiction</h3>
                  <p className="font-bold text-slate-400">{regions.find(r => r.id === selectedRegion)?.count} Active Bills & Laws</p>
                </div>
              </div>

              <div className="space-y-4">
                {laws
                  .filter(l => {
                    if (selectedRegion === 'federal') return l.level === 'federal';
                    if (selectedRegion === 'state') return l.level === 'state';
                    return l.level === 'city' || l.level === 'county';
                  })
                  .slice(0, 5)
                  .map(law => (
                    <button
                      key={law.id}
                      onClick={() => onSelectLaw(law)}
                      className="group flex w-full items-center justify-between rounded-[32px] bg-white p-6 shadow-xl shadow-slate-200/30 border-2 border-transparent transition-all hover:border-indigo-600 hover:scale-[1.02]"
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                          <Info size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black tracking-tight text-indigo-950 line-clamp-1">{law.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{law.category}</p>
                        </div>
                      </div>
                      <ArrowRight size={20} className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
                    </button>
                  ))}
              </div>

              {laws.filter(l => {
                if (selectedRegion === 'federal') return l.level === 'federal';
                if (selectedRegion === 'state') return l.level === 'state';
                return l.level === 'city' || l.level === 'county';
              }).length === 0 && (
                <div className="flex h-48 flex-col items-center justify-center gap-4 rounded-[40px] border-4 border-dashed border-slate-100 bg-white text-slate-400">
                  <Info size={40} />
                  <p className="font-bold">No laws found for this jurisdiction.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center text-slate-400">
              <div className="flex h-24 w-24 items-center justify-center rounded-[40px] bg-slate-50">
                <MapIcon size={48} />
              </div>
              <div>
                <p className="text-xl font-black tracking-tight text-indigo-950">Explore Jurisdictions</p>
                <p className="mt-2 font-bold max-w-xs">Select a level on the map to see specific legislation affecting your area.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
