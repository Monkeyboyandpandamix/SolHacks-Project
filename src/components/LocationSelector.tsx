import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

interface LocationSelectorProps {
  onLocationChange: (state: string, city: string, language: string) => void;
  onInterestChange: (interest: string) => void;
  initialState: string;
  initialCity: string;
  initialLanguage: string;
  initialInterest?: string;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ onLocationChange, onInterestChange, initialState, initialCity, initialLanguage, initialInterest = 'all' }) => {
  const [state, setState] = useState(initialState);
  const [city, setCity] = useState(initialCity);
  const [language, setLanguage] = useState(initialLanguage);
  const [interest, setInterest] = useState(initialInterest);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (city.length < 2) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await axios.get(`/api/location/suggest?query=${city}&state=${state}`);
        setSuggestions(response.data);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Failed to fetch suggestions", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(timeoutId);
  }, [city, state]);

  const handleUpdate = () => {
    onLocationChange(state, city, language);
  };

  const selectSuggestion = (s: string) => {
    setCity(s);
    setShowSuggestions(false);
  };

  const handleInterestChange = (newInterest: string) => {
    setInterest(newInterest);
    onInterestChange(newInterest);
  };

  const interests = [
    { id: 'all', label: 'All Interests' },
    { id: 'immigration', label: 'Immigration' },
    { id: 'housing', label: 'Housing & Tenant' },
    { id: 'labor', label: 'Employment & Labor' },
    { id: 'education', label: 'Education' },
    { id: 'health', label: 'Health & Benefits' },
    { id: 'environment', label: 'Environment' },
  ];

  const states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", 
    "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", 
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", 
    "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", 
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
  ];

  const languages = [
    { id: 'English', label: 'English' },
    { id: 'Spanish', label: 'Español' },
    { id: 'Chinese', label: '中文' },
    { id: 'Myanmar', label: 'မြန်မာ' },
    { id: 'Tagalog', label: 'Tagalog' },
    { id: 'Vietnamese', label: 'Tiếng Việt' },
    { id: 'Arabic', label: 'العربية' },
    { id: 'French', label: 'Français' },
    { id: 'Korean', label: '한국어' },
    { id: 'Russian', label: 'Русский' },
  ];

  return (
    <div className="card mb-6 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-color/10 text-accent-color">
            <MapPin size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Update Location</h2>
            <p className="text-xs text-muted">Find legislation relevant to your area</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted">State</label>
            <select 
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-lg border border-border-color bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-color"
            >
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted">City / County</label>
            <div className="relative" ref={suggestionRef}>
              <input 
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Enter city or county"
                className="w-full rounded-lg border border-border-color bg-transparent px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-accent-color"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              {isSearching && (
                <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-accent-color" />
              )}
              
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border-color bg-white shadow-xl"
                  >
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectSuggestion(s)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted">Primary Interest</label>
            <select 
              value={interest}
              onChange={(e) => handleInterestChange(e.target.value)}
              className="rounded-lg border border-border-color bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-color"
            >
              {interests.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted">Preferred Language</label>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-border-color bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-color"
            >
              {languages.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <button 
              onClick={handleUpdate}
              className="btn-primary flex w-full items-center justify-center gap-2"
            >
              <Navigation size={18} />
              Update Feed
            </button>
          </div>
      </div>
    </div>
  );
};

export default LocationSelector;
