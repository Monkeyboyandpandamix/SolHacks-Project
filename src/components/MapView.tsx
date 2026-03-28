import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Building2, Landmark, MapPin } from 'lucide-react';
import { Law } from '../types';

interface MapViewProps {
  laws: Law[];
  onSelectLaw: (law: Law) => void;
}

type ScopeFilter = 'all' | 'federal' | 'state' | 'local';

const STATE_POINTS: Record<string, { x: number; y: number; short: string }> = {
  Alabama: { x: 628, y: 324, short: 'AL' },
  Alaska: { x: 126, y: 405, short: 'AK' },
  Arizona: { x: 165, y: 280, short: 'AZ' },
  Arkansas: { x: 493, y: 296, short: 'AR' },
  California: { x: 82, y: 238, short: 'CA' },
  Colorado: { x: 265, y: 214, short: 'CO' },
  Connecticut: { x: 771, y: 160, short: 'CT' },
  Delaware: { x: 748, y: 199, short: 'DE' },
  Florida: { x: 702, y: 377, short: 'FL' },
  Georgia: { x: 646, y: 317, short: 'GA' },
  Hawaii: { x: 242, y: 419, short: 'HI' },
  Idaho: { x: 157, y: 141, short: 'ID' },
  Illinois: { x: 528, y: 197, short: 'IL' },
  Indiana: { x: 559, y: 197, short: 'IN' },
  Iowa: { x: 446, y: 172, short: 'IA' },
  Kansas: { x: 378, y: 231, short: 'KS' },
  Kentucky: { x: 578, y: 236, short: 'KY' },
  Louisiana: { x: 496, y: 347, short: 'LA' },
  Maine: { x: 797, y: 107, short: 'ME' },
  Maryland: { x: 731, y: 206, short: 'MD' },
  Massachusetts: { x: 780, y: 145, short: 'MA' },
  Michigan: { x: 563, y: 144, short: 'MI' },
  Minnesota: { x: 439, y: 112, short: 'MN' },
  Mississippi: { x: 563, y: 322, short: 'MS' },
  Missouri: { x: 456, y: 236, short: 'MO' },
  Montana: { x: 254, y: 117, short: 'MT' },
  Nebraska: { x: 375, y: 195, short: 'NE' },
  Nevada: { x: 133, y: 193, short: 'NV' },
  'New Hampshire': { x: 781, y: 125, short: 'NH' },
  'New Jersey': { x: 753, y: 187, short: 'NJ' },
  'New Mexico': { x: 245, y: 283, short: 'NM' },
  'New York': { x: 734, y: 152, short: 'NY' },
  'North Carolina': { x: 678, y: 258, short: 'NC' },
  'North Dakota': { x: 381, y: 112, short: 'ND' },
  Ohio: { x: 606, y: 192, short: 'OH' },
  Oklahoma: { x: 406, y: 283, short: 'OK' },
  Oregon: { x: 95, y: 132, short: 'OR' },
  Pennsylvania: { x: 702, y: 176, short: 'PA' },
  'Rhode Island': { x: 789, y: 154, short: 'RI' },
  'South Carolina': { x: 666, y: 286, short: 'SC' },
  'South Dakota': { x: 380, y: 149, short: 'SD' },
  Tennessee: { x: 588, y: 267, short: 'TN' },
  Texas: { x: 384, y: 351, short: 'TX' },
  Utah: { x: 188, y: 214, short: 'UT' },
  Vermont: { x: 759, y: 128, short: 'VT' },
  Virginia: { x: 699, y: 229, short: 'VA' },
  Washington: { x: 102, y: 96, short: 'WA' },
  'West Virginia': { x: 649, y: 213, short: 'WV' },
  Wisconsin: { x: 493, y: 141, short: 'WI' },
  Wyoming: { x: 240, y: 163, short: 'WY' },
};

const MAP_SHAPE = 'M64 88 C124 46 193 41 245 48 C297 56 361 45 418 47 C484 49 543 64 598 81 C650 97 706 120 748 154 C790 188 813 225 806 260 C797 301 744 330 691 351 C630 375 566 381 512 382 C448 383 403 367 345 365 C282 362 217 373 163 359 C110 345 68 311 50 262 C30 207 19 120 64 88 Z';

const scopeMatches = (law: Law, filter: ScopeFilter) => {
  if (filter === 'all') return true;
  if (filter === 'federal') return law.level === 'federal';
  if (filter === 'state') return law.level === 'state';
  return law.level === 'city' || law.level === 'county';
};

const MapView: React.FC<MapViewProps> = ({ laws, onSelectLaw }) => {
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [selectedState, setSelectedState] = useState<string | null>(laws.find((law) => law.location.state)?.location.state || null);

  const stateTotals = useMemo(() => {
    return laws.reduce((acc: Record<string, number>, law) => {
      if (!law.location.state) return acc;
      acc[law.location.state] = (acc[law.location.state] || 0) + 1;
      return acc;
    }, {});
  }, [laws]);

  const filteredLaws = useMemo(() => {
    return laws.filter((law) => {
      const matchesScope = scopeMatches(law, scopeFilter);
      const matchesState = !selectedState || law.location.state === selectedState || (selectedState === 'Federal' && law.level === 'federal');
      return matchesScope && matchesState;
    });
  }, [laws, scopeFilter, selectedState]);

  const maxStateCount = Math.max(...(Object.values(stateTotals) as number[]), 1);
  const federalCount = laws.filter((law) => law.level === 'federal').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Map view</h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          Explore where the current legislation in your feed is coming from. Select a state marker or the federal layer to filter the list.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">United States legislation map</p>
              <p className="text-xs text-slate-500">Bubble size reflects how many laws are currently loaded for that state.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All laws' },
                { id: 'federal', label: 'Federal' },
                { id: 'state', label: 'State' },
                { id: 'local', label: 'Local' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setScopeFilter(option.id as ScopeFilter)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    scopeFilter === option.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),transparent_38%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]">
            <svg viewBox="0 0 860 450" className="h-auto w-full">
              <rect x="0" y="0" width="860" height="450" fill="transparent" />
              <path d={MAP_SHAPE} fill="#dbe7fb" stroke="#94a3b8" strokeWidth="5" strokeLinejoin="round" />
              <path d="M90 388 C107 372 126 366 149 367" fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
              <path d="M219 410 C236 399 258 396 280 401" fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />

              {(Object.entries(stateTotals) as Array<[string, number]>).map(([state, count]) => {
                const point = STATE_POINTS[state];
                if (!point) return null;
                const isActive = selectedState === state;
                const radius = 7 + (count / maxStateCount) * 15;
                return (
                  <g key={state} className="cursor-pointer" onClick={() => setSelectedState(state)}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={radius}
                      fill={isActive ? '#0f172a' : '#2563eb'}
                      fillOpacity={isActive ? 0.95 : 0.8}
                      stroke="#ffffff"
                      strokeWidth="3"
                    />
                    <text x={point.x} y={point.y + 3} textAnchor="middle" className="fill-white text-[9px] font-semibold">
                      {point.short}
                    </text>
                  </g>
                );
              })}

              <g className="cursor-pointer" onClick={() => setSelectedState('Federal')}>
                <rect x="34" y="26" width="136" height="48" rx="16" fill={selectedState === 'Federal' ? '#0f172a' : '#ffffff'} stroke="#cbd5e1" strokeWidth="2" />
                <text x="58" y="46" className={`text-[12px] font-semibold ${selectedState === 'Federal' ? 'fill-white' : 'fill-slate-900'}`}>
                  Federal laws
                </text>
                <text x="58" y="62" className={`text-[11px] ${selectedState === 'Federal' ? 'fill-slate-300' : 'fill-slate-500'}`}>
                  {federalCount} loaded
                </text>
              </g>
            </svg>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {selectedState || 'All states'}
                {selectedState === 'Federal' ? '' : selectedState ? ' legislation' : ' legislation'}
              </p>
              <p className="mt-1 text-xs text-slate-500">{filteredLaws.length} matching items in the current feed.</p>
            </div>
            {selectedState && (
              <button onClick={() => setSelectedState(null)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">
                Clear
              </button>
            )}
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Landmark size={14} />
                <span className="text-xs">Federal</span>
              </div>
              <p className="mt-2 text-xl font-semibold text-slate-950">{laws.filter((law) => scopeMatches(law, 'federal') && (!selectedState || law.level === 'federal')).length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Building2 size={14} />
                <span className="text-xs">State</span>
              </div>
              <p className="mt-2 text-xl font-semibold text-slate-950">{laws.filter((law) => scopeMatches(law, 'state') && (!selectedState || law.location.state === selectedState)).length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin size={14} />
                <span className="text-xs">Local</span>
              </div>
              <p className="mt-2 text-xl font-semibold text-slate-950">{laws.filter((law) => scopeMatches(law, 'local') && (!selectedState || law.location.state === selectedState)).length}</p>
            </div>
          </div>

          <div className="space-y-3">
            {filteredLaws.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No laws match this map selection yet.
              </div>
            )}

            {filteredLaws.slice(0, 7).map((law) => (
              <motion.button
                key={law.id}
                whileHover={{ y: -2 }}
                onClick={() => onSelectLaw(law)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-950">{law.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {law.location.city ? `${law.location.city}, ` : ''}
                    {law.location.state} · {law.level} · {law.category}
                  </p>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </motion.button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MapView;
