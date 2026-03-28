import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Building2, Landmark, MapPin } from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { Law } from '../types';

interface MapViewProps {
  laws: Law[];
  onSelectLaw: (law: Law) => void;
}

type ScopeFilter = 'all' | 'federal' | 'state' | 'local';

type StateCenter = {
  lat: number;
  lng: number;
  short: string;
};

const US_CENTER: [number, number] = [39.8283, -98.5795];
const US_ZOOM = 4;
const SELECTED_ZOOM = 6;

const STATE_CENTERS: Record<string, StateCenter> = {
  Alabama: { lat: 32.8067, lng: -86.7911, short: 'AL' },
  Alaska: { lat: 61.3707, lng: -152.4044, short: 'AK' },
  Arizona: { lat: 33.7298, lng: -111.4312, short: 'AZ' },
  Arkansas: { lat: 34.9697, lng: -92.3731, short: 'AR' },
  California: { lat: 36.1162, lng: -119.6816, short: 'CA' },
  Colorado: { lat: 39.0598, lng: -105.3111, short: 'CO' },
  Connecticut: { lat: 41.5978, lng: -72.7554, short: 'CT' },
  Delaware: { lat: 39.3185, lng: -75.5071, short: 'DE' },
  Florida: { lat: 27.7663, lng: -81.6868, short: 'FL' },
  Georgia: { lat: 33.0406, lng: -83.6431, short: 'GA' },
  Hawaii: { lat: 21.0943, lng: -157.4983, short: 'HI' },
  Idaho: { lat: 44.2405, lng: -114.4788, short: 'ID' },
  Illinois: { lat: 40.3495, lng: -88.9861, short: 'IL' },
  Indiana: { lat: 39.8494, lng: -86.2583, short: 'IN' },
  Iowa: { lat: 42.0115, lng: -93.2105, short: 'IA' },
  Kansas: { lat: 38.5266, lng: -96.7265, short: 'KS' },
  Kentucky: { lat: 37.6681, lng: -84.6701, short: 'KY' },
  Louisiana: { lat: 31.1695, lng: -91.8678, short: 'LA' },
  Maine: { lat: 44.6939, lng: -69.3819, short: 'ME' },
  Maryland: { lat: 39.0639, lng: -76.8021, short: 'MD' },
  Massachusetts: { lat: 42.2302, lng: -71.5301, short: 'MA' },
  Michigan: { lat: 43.3266, lng: -84.5361, short: 'MI' },
  Minnesota: { lat: 45.6945, lng: -93.9002, short: 'MN' },
  Mississippi: { lat: 32.7416, lng: -89.6787, short: 'MS' },
  Missouri: { lat: 38.4561, lng: -92.2884, short: 'MO' },
  Montana: { lat: 46.9219, lng: -110.4544, short: 'MT' },
  Nebraska: { lat: 41.1254, lng: -98.2681, short: 'NE' },
  Nevada: { lat: 38.3135, lng: -117.0554, short: 'NV' },
  'New Hampshire': { lat: 43.4525, lng: -71.5639, short: 'NH' },
  'New Jersey': { lat: 40.2989, lng: -74.521, short: 'NJ' },
  'New Mexico': { lat: 34.8405, lng: -106.2485, short: 'NM' },
  'New York': { lat: 42.1657, lng: -74.9481, short: 'NY' },
  'North Carolina': { lat: 35.6301, lng: -79.8064, short: 'NC' },
  'North Dakota': { lat: 47.5289, lng: -99.784, short: 'ND' },
  Ohio: { lat: 40.3888, lng: -82.7649, short: 'OH' },
  Oklahoma: { lat: 35.5653, lng: -96.9289, short: 'OK' },
  Oregon: { lat: 44.572, lng: -122.0709, short: 'OR' },
  Pennsylvania: { lat: 40.5908, lng: -77.2098, short: 'PA' },
  'Rhode Island': { lat: 41.6809, lng: -71.5118, short: 'RI' },
  'South Carolina': { lat: 33.8569, lng: -80.945, short: 'SC' },
  'South Dakota': { lat: 44.2998, lng: -99.4388, short: 'SD' },
  Tennessee: { lat: 35.7478, lng: -86.6923, short: 'TN' },
  Texas: { lat: 31.0545, lng: -97.5635, short: 'TX' },
  Utah: { lat: 40.150, lng: -111.8624, short: 'UT' },
  Vermont: { lat: 44.0459, lng: -72.7107, short: 'VT' },
  Virginia: { lat: 37.7693, lng: -78.17, short: 'VA' },
  Washington: { lat: 47.4009, lng: -121.4905, short: 'WA' },
  'West Virginia': { lat: 38.4912, lng: -80.9545, short: 'WV' },
  Wisconsin: { lat: 44.2685, lng: -89.6165, short: 'WI' },
  Wyoming: { lat: 42.7560, lng: -107.3025, short: 'WY' },
  'Washington D.C.': { lat: 38.9072, lng: -77.0369, short: 'DC' },
  'Puerto Rico': { lat: 18.2208, lng: -66.5901, short: 'PR' },
};

const scopeMatches = (law: Law, filter: ScopeFilter) => {
  if (filter === 'all') return true;
  if (filter === 'federal') return law.level === 'federal';
  if (filter === 'state') return law.level === 'state';
  return law.level === 'city' || law.level === 'county';
};

const MapViewport: React.FC<{ selectedState: string | null }> = ({ selectedState }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedState && selectedState !== 'Federal') {
      const center = STATE_CENTERS[selectedState];
      if (center) {
        map.setView([center.lat, center.lng], SELECTED_ZOOM, { animate: true });
        return;
      }
    }

    if (selectedState === 'Federal') {
      map.setView(STATE_CENTERS['Washington D.C.'] ? [STATE_CENTERS['Washington D.C.'].lat, STATE_CENTERS['Washington D.C.'].lng] : US_CENTER, 7, { animate: true });
      return;
    }

    map.setView(US_CENTER, US_ZOOM, { animate: true });
  }, [map, selectedState]);

  return null;
};

const MapView: React.FC<MapViewProps> = ({ laws, onSelectLaw }) => {
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [selectedState, setSelectedState] = useState<string | null>(laws.find((law) => law.location.state)?.location.state || null);

  const stateTotals = useMemo(() => {
    return laws.reduce((acc: Record<string, number>, law) => {
      if (!law.location.state || law.level === 'federal') return acc;
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

  const mapStates = useMemo(() => {
    return Object.entries(stateTotals)
      .filter(([state]) => Boolean(STATE_CENTERS[state]))
      .map(([state, count]) => ({
        state,
        count,
        center: STATE_CENTERS[state],
      }));
  }, [stateTotals]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Map view</h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          Explore where the legislation in your feed is coming from on a real OpenStreetMap layer. Select a state bubble or the federal marker to filter the list.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">United States legislation map</p>
              <p className="text-xs text-slate-500">Bubble size reflects how many loaded laws are tied to each state.</p>
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

          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <MapContainer
              center={US_CENTER}
              zoom={US_ZOOM}
              minZoom={3}
              maxZoom={10}
              scrollWheelZoom
              className="h-[540px] w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapViewport selectedState={selectedState} />

              {mapStates.map(({ state, count, center }) => {
                const isActive = selectedState === state;
                const radius = 10 + (count / maxStateCount) * 16;
                return (
                  <CircleMarker
                    key={state}
                    center={[center.lat, center.lng]}
                    radius={radius}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 2,
                      fillColor: isActive ? '#0f172a' : '#2563eb',
                      fillOpacity: isActive ? 0.92 : 0.78,
                    }}
                    eventHandlers={{
                      click: () => setSelectedState((current) => current === state ? null : state),
                    }}
                  >
                    <Popup>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{state}</p>
                        <p className="text-xs text-slate-600">{count} loaded law{count === 1 ? '' : 's'}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

              <CircleMarker
                center={[38.9072, -77.0369]}
                radius={10 + Math.min(federalCount, 12)}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: selectedState === 'Federal' ? '#7c3aed' : '#111827',
                  fillOpacity: 0.9,
                }}
                eventHandlers={{
                  click: () => setSelectedState((current) => current === 'Federal' ? null : 'Federal'),
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">Federal</p>
                    <p className="text-xs text-slate-600">{federalCount} loaded law{federalCount === 1 ? '' : 's'}</p>
                  </div>
                </Popup>
              </CircleMarker>
            </MapContainer>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {selectedState ? `${selectedState} legislation` : 'All legislation'}
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
              <p className="mt-2 text-xl font-semibold text-slate-950">
                {laws.filter((law) => scopeMatches(law, 'federal') && (!selectedState || selectedState === 'Federal')).length}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Building2 size={14} />
                <span className="text-xs">State</span>
              </div>
              <p className="mt-2 text-xl font-semibold text-slate-950">
                {laws.filter((law) => scopeMatches(law, 'state') && (!selectedState || law.location.state === selectedState)).length}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin size={14} />
                <span className="text-xs">Local</span>
              </div>
              <p className="mt-2 text-xl font-semibold text-slate-950">
                {laws.filter((law) => scopeMatches(law, 'local') && (!selectedState || law.location.state === selectedState)).length}
              </p>
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
