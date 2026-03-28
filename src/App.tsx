import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bookmark, 
  LayoutGrid, 
  MessageSquare, 
  Info, 
  AlertTriangle, 
  Scale, 
  LayoutDashboard, 
  Map, 
  User as UserIcon, 
  MapPin, 
  Bell, 
  Settings,
  Search,
  Filter,
  ChevronRight,
  ChevronUp,
  TrendingUp,
  Globe,
  Building2,
  Users,
  Zap,
  CheckCircle,
  AlertCircle,
  Landmark,
  ShieldCheck,
  History,
  BarChart3,
  XCircle,
  UsersRound
} from 'lucide-react';
import Header from './components/Header';
import LocationSelector, { STATE_FLAGS, STATE_ABBR } from './components/LocationSelector';
import LawFeed from './components/LawFeed';
import LawCard from './components/LawCard';
import CompareLaws from './components/CompareLaws';
import MapView from './components/MapView';
import RoadmapView from './components/RoadmapView';
import AnalyticsView from './components/AnalyticsView';
import RepresentativeCard from './components/RepresentativeCard';
import AILawyer from './components/AILawyer';
import AskAIFloatingButton from './components/AskAIFloatingButton';
import CommunityView from './components/CommunityView';
import { Law, UserSettings, Notification, Comment, UserProfile, Representative } from './types';
import { fetchLaws, mergeCanonicalLaws } from './services/geminiService';

import { auth, db, signIn, logOut, onAuthStateChanged, handleFirestoreError, OperationType } from './firebase';
import { collection, deleteDoc, doc, getDoc, setDoc, getDocs, Timestamp } from 'firebase/firestore';

const CORE_FILTER_TOPICS = [
  'Housing',
  'Labor',
  'Education',
  'Health',
  'Environment',
];

const CULTURAL_FILTER_TOPICS = [
  'Immigration',
  'Language Access',
  'Indigenous Rights',
  'Arts & Culture Funding',
  'Racial Equity',
  'Religious Freedom',
  'LGBTQ+ Rights',
  'Refugee & Asylum',
  'Voting Access',
];

const HYBRID_FILTER_TOPICS = [...CORE_FILTER_TOPICS, ...CULTURAL_FILTER_TOPICS];

const CORE_PROFILE_TOPICS = [
  'Housing',
  'Labor',
  'Education',
  'Health',
  'Environment',
  'Taxes',
  'Transport',
];

const CULTURAL_PROFILE_TOPICS = [
  'Immigration',
  'Language Access',
  'Indigenous Rights',
  'Arts & Culture Funding',
  'Racial Equity',
  'Religious Freedom',
  'LGBTQ+ Rights',
  'Refugee & Asylum',
  'Voting Access',
  'Heritage Preservation',
  'Education Equity',
  'Housing Discrimination',
  'International Students',
  'Hate Crimes',
];

const HYBRID_PROFILE_TOPICS = [...CORE_PROFILE_TOPICS, ...CULTURAL_PROFILE_TOPICS];
const SETTINGS_STORAGE_KEY = 'culturact_settings';
const LEGACY_SETTINGS_STORAGE_KEY = 'civiclens_settings';

function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as T;
  }

  if (value && typeof value === 'object') {
    const cleanedEntries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([entryKey, entryValue]) => [entryKey, sanitizeForFirestore(entryValue)]);
    return Object.fromEntries(cleanedEntries) as T;
  }

  return value;
}

function buildLegacyCachePrefixes(state: string, city: string, language: string) {
  return [
    `v2_${state}_${city}_${language}_`,
    `v3_${state}_${city}_${language}`,
  ];
}

export default function App() {
  const LAWS_PER_PAGE = 5;
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY) || localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      highContrast: false,
      fontSize: 'medium',
      underlineLinks: false,
      language: "English",
      location: {
        state: "California",
        city: "San Francisco"
      },
      interests: []
    };
  });

  const [laws, setLaws] = useState<Law[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'saved' | 'profile' | 'map' | 'digest' | 'roadmap' | 'analytics' | 'community'>('feed');
  const [levelFilter, setLevelFilter] = useState<'all' | 'federal' | 'state' | 'county' | 'city'>('all');
  const [interestFilter, setInterestFilter] = useState<string>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [lawsToCompare, setLawsToCompare] = useState<Law[]>([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [savedPage, setSavedPage] = useState(1);

  useEffect(() => {
    // Keydown shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Scroll progress
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = windowHeight ? totalScroll / windowHeight : 0;
      setScrollProgress(scroll);
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create profile
        try {
          const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              location: settings.location,
              interests: settings.interests || [],
              followedTopics: [],
              lastUpdated: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', currentUser.uid), newProfile);
            setUserProfile(newProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, [settings.location, settings.interests]);

  const loadLaws = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Check Cache in Firestore
      const cacheKey = `v4_${settings.location.state}_${settings.location.city}_${settings.language}`;
      const cacheRef = doc(db, 'laws_cache', cacheKey);
      let data: Law[] = [];
      let cachedLaws: Law[] = [];
      let cacheLastUpdated = 0;
      const CACHE_LIMIT = 4 * 60 * 60 * 1000; // 4 hours
      const legacyPrefixes = buildLegacyCachePrefixes(settings.location.state, settings.location.city, settings.language);
      const staleCacheRefs: Array<ReturnType<typeof doc>> = [];

      try {
        const cacheDoc = await getDoc(cacheRef);
        if (cacheDoc.exists()) {
          const cacheData = cacheDoc.data();
          cacheLastUpdated = new Date(cacheData.lastUpdated).getTime();
          cachedLaws = Array.isArray(cacheData.laws) ? cacheData.laws : [];
          if (cachedLaws.length > 0) {
            console.log("Using cached laws from Firestore");
            data = cachedLaws;
          }
        }
      } catch (cacheReadErr) {
        console.warn("Failed to read Firestore cache", cacheReadErr);
      }

      if (cachedLaws.length === 0) {
        try {
          const legacySnapshot = await getDocs(collection(db, 'laws_cache'));
          const legacyDocs = legacySnapshot.docs.filter((entry) =>
            entry.id !== cacheKey && legacyPrefixes.some((prefix) => entry.id.startsWith(prefix)),
          );

          if (legacyDocs.length > 0) {
            const legacyMerged = legacyDocs.reduce<Law[]>((accumulator, entry) => {
              const entryLaws = Array.isArray(entry.data().laws) ? entry.data().laws as Law[] : [];
              staleCacheRefs.push(entry.ref);
              return mergeCanonicalLaws(accumulator, entryLaws, settings.location.state, settings.location.city);
            }, []);

            if (legacyMerged.length > 0) {
              cachedLaws = mergeCanonicalLaws(cachedLaws, legacyMerged, settings.location.state, settings.location.city);
              data = cachedLaws;

              await setDoc(cacheRef, {
                laws: sanitizeForFirestore(cachedLaws),
                lastUpdated: new Date().toISOString()
              });

              await Promise.all(staleCacheRefs.map((staleRef) => deleteDoc(staleRef).catch((error) => {
                console.warn("Failed to delete stale laws cache doc", staleRef.id, error);
              })));
            }
          }
        } catch (legacyCacheErr) {
          console.warn("Failed to migrate legacy Firestore cache", legacyCacheErr);
        }
      }

      const now = new Date().getTime();
      const shouldRefresh = cachedLaws.length === 0 || now - cacheLastUpdated >= CACHE_LIMIT;

      // 2. If cache is missing or stale, fetch fresh laws and merge only new canonical entries
      if (shouldRefresh) {
        console.log("Fetching fresh laws from APIs");
        const freshResult = await fetchLaws(
          settings.location.state, 
          settings.location.city, 
          settings.language,
          userProfile?.situation,
          'all'
        );
        const freshLaws = freshResult.laws;

        if (freshResult.warnings.length > 0) {
          const warningNotifications = freshResult.warnings.map((message, index) => ({
            id: `warning-${Date.now()}-${index}`,
            title: 'State Feed Notice',
            message,
            date: new Date().toLocaleString(),
            read: false,
            type: 'update' as const,
          }));
          setNotifications((prev) => [...warningNotifications, ...prev].slice(0, 20));
        }

        data = mergeCanonicalLaws(cachedLaws, freshLaws, settings.location.state, settings.location.city);

        if (data.length > 0) {
          try {
            await setDoc(cacheRef, {
              laws: sanitizeForFirestore(data),
              lastUpdated: new Date().toISOString()
            });

            if (staleCacheRefs.length > 0) {
              await Promise.all(staleCacheRefs.map((staleRef) => deleteDoc(staleRef).catch((error) => {
                console.warn("Failed to delete stale laws cache doc", staleRef.id, error);
              })));
            }
          } catch (cacheErr) {
            console.warn("Failed to update Firestore cache", cacheErr);
            // Non-blocking error
          }
        }
      }
      
      if (data.length === 0) {
        setError("No laws found for your location. Try adjusting your settings.");
      }
      
      // Merge with saved status from local storage (or Firestore later)
      const savedIds = JSON.parse(localStorage.getItem('civiclens_saved') || '[]');
      const processedLaws = data.map(law => ({
        ...law,
        saved: savedIds.includes(law.id)
      }));
      
      setLaws(processedLaws);
    } catch (err) {
      setError("Failed to load laws. Please try again.");
      handleFirestoreError(err, OperationType.GET, "laws_cache");
    } finally {
      setIsLoading(false);
    }
  }, [settings.location, settings.language, settings.interests, userProfile?.situation]);

  useEffect(() => {
    loadLaws();
  }, [loadLaws]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
    
    // Apply accessibility classes to body
    document.body.classList.toggle('high-contrast', settings.highContrast);
    document.body.classList.toggle('font-size-small', settings.fontSize === 'small');
    document.body.classList.toggle('font-size-large', settings.fontSize === 'large');
    document.body.classList.toggle('font-size-extra-small', settings.fontSize === 'extra-small');
    document.body.classList.toggle('font-size-extra-large', settings.fontSize === 'extra-large');
    document.body.classList.toggle('underline-links', !!settings.underlineLinks);
  }, [settings]);

  const handleSaveSituation = async (situation: string) => {
    if (!user) {
      signIn();
      return;
    }
    try {
      const updatedProfile = { ...userProfile!, situation, lastUpdated: new Date().toISOString() };
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setUserProfile(updatedProfile);
      loadLaws(); // Reload laws with new context
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleToggleFollowTopic = async (topic: string) => {
    if (!user) {
      signIn();
      return;
    }
    try {
      const topics = userProfile?.followedTopics.includes(topic) 
        ? userProfile.followedTopics.filter(t => t !== topic)
        : [...(userProfile?.followedTopics || []), topic];
      const updatedProfile = { ...userProfile!, followedTopics: topics, lastUpdated: new Date().toISOString() };
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setUserProfile(updatedProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleLocationChange = (state: string, city: string, language: string) => {
    setSettings(prev => ({
      ...prev,
      location: { state, city },
      language
    }));
  };

  const handlePrimaryInterestChange = (interest: string) => {
    setInterestFilter(interest);
    setSettings((prev) => ({
      ...prev,
      interests: interest === 'all' ? [] : [interest],
    }));
  };

  const handleSaveLaw = (id: string) => {
    setLaws(prev => {
      const updated = prev.map(law => 
        law.id === id ? { ...law, saved: !law.saved } : law
      );
      
      const savedIds = updated.filter(l => l.saved).map(l => l.id);
      localStorage.setItem('civiclens_saved', JSON.stringify(savedIds));
      
      return updated;
    });
  };

  const handleCompare = (law: Law) => {
    setLawsToCompare(prev => {
      if (prev.find(l => l.id === law.id)) {
        return prev.filter(l => l.id !== law.id);
      }
      if (prev.length >= 2) {
        return [prev[1], law];
      }
      return [...prev, law];
    });
  };

  const handleVote = (id: string, type: 'support' | 'oppose') => {
    setLaws(prev => prev.map(law => {
      if (law.id !== id) return law;
      
      const isRemoving = law.userVote === type;
      const newVote = isRemoving ? undefined : type;
      
      const votes = { ...law.votes! };
      if (isRemoving) {
        votes[type]--;
      } else {
        if (law.userVote) {
          votes[law.userVote]--;
        }
        votes[type]++;
      }
      
      return { ...law, userVote: newVote, votes };
    }));
  };

  const handleComment = (id: string, text: string) => {
    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: 'user-1',
      userName: 'You',
      text,
      date: new Date().toLocaleDateString(),
    };

    setLaws(prev => prev.map(law => {
      if (law.id === id) {
        return { ...law, comments: [newComment, ...(law.comments || [])] };
      }
      return law;
    }));
  };

  const handlePollVote = (id: string, optionLabel: string) => {
    setLaws(prev => prev.map(law => {
      if (law.id === id && law.poll) {
        const options = law.poll.options.map(opt => {
          if (opt.label === optionLabel) {
            return { ...opt, count: opt.count + 1 };
          }
          if (opt.label === law.poll?.userChoice) {
            return { ...opt, count: Math.max(0, opt.count - 1) };
          }
          return opt;
        });
        return { ...law, poll: { ...law.poll, options, userChoice: optionLabel } };
      }
      return law;
    }));
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleToggleInterestFilter = (topic: string) => {
    const normalized = topic.toLowerCase();
    setInterestFilter((current) => current === normalized ? 'all' : normalized);
  };

  const handleToggleLevelFilter = (level: 'all' | 'federal' | 'state' | 'county' | 'city') => {
    setLevelFilter((current) => current === level ? 'all' : level);
  };

  const filteredLaws = laws.filter(law => {
    const matchesLevel = levelFilter === 'all' || law.level === levelFilter;
    const matchesInterest = interestFilter === 'all' || law.category.toLowerCase().includes(interestFilter.toLowerCase());
    return matchesLevel && matchesInterest;
  });
  const primaryInterest = settings.interests[0] || 'all';
  const prioritizedFilteredLaws = [...filteredLaws].sort((a, b) => {
    if (primaryInterest === 'all') return 0;
    const aMatches = a.category.toLowerCase().includes(primaryInterest.toLowerCase()) ? 1 : 0;
    const bMatches = b.category.toLowerCase().includes(primaryInterest.toLowerCase()) ? 1 : 0;
    return bMatches - aMatches;
  });
  const totalPages = Math.max(1, Math.ceil(prioritizedFilteredLaws.length / LAWS_PER_PAGE));
  const paginatedLaws = prioritizedFilteredLaws.slice((currentPage - 1) * LAWS_PER_PAGE, currentPage * LAWS_PER_PAGE);
  const savedLaws = laws.filter(l => l.saved);
  const savedTotalPages = Math.max(1, Math.ceil(savedLaws.length / LAWS_PER_PAGE));
  const paginatedSavedLaws = savedLaws.slice((savedPage - 1) * LAWS_PER_PAGE, savedPage * LAWS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [settings.location, settings.language, settings.interests, interestFilter, levelFilter, laws.length]);

  useEffect(() => {
    setSavedPage(1);
  }, [laws.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (savedPage > savedTotalPages) {
      setSavedPage(savedTotalPages);
    }
  }, [savedPage, savedTotalPages]);

  return (
    <div className={`min-h-screen bg-background-color text-text-primary text-base`}>
      {/* Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 z-50 origin-left"
        style={{ scaleX: scrollProgress }}
      />
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-72 border-r border-slate-200 bg-white sm:translate-x-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar pb-32">
          <div className="mb-12 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200">
            <Scale size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-indigo-950">CULTURACT</h1>
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400">COMMUNITY POWERED CIVICS</p>
          </div>
        </div>

        <nav className="space-y-3">
          {[
            { id: 'feed', icon: LayoutDashboard, label: 'LEGISLATIVE FEED' },
            { id: 'saved', icon: Bookmark, label: 'SAVED LAWS' },
            { id: 'map', icon: Map, label: 'MAP VIEW' },
            { id: 'digest', icon: Zap, label: 'WEEKLY DIGEST' },
            { id: 'profile', icon: UserIcon, label: 'MY PROFILE' },
            { id: 'analytics', icon: BarChart3, label: 'ANALYTICS' },
            { id: 'community', icon: UsersRound, label: 'COMMUNITY' },
            { id: 'roadmap', icon: History, label: 'ROADMAP' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-sm font-black transition-all ${activeTab === tab.id ? 'text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}
            >
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute inset-0 bg-indigo-600 rounded-2xl" />
              )}
              <tab.icon size={20} className="relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-12 border-t border-slate-100 pt-10">
          <h3 className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <Filter size={12} />
            Quick Filters
          </h3>
          <div className="space-y-2">
            {[
              { id: 'all', label: 'All Levels', icon: Globe },
              { id: 'federal', label: 'Federal', icon: Building2 },
              { id: 'state', label: 'State', icon: MapPin },
              { id: 'county', label: 'County', icon: LayoutGrid },
              { id: 'city', label: 'City', icon: Building2 },
            ].map((level) => (
              <button
                key={level.id}
                onClick={() => handleToggleLevelFilter(level.id as any)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-xs font-bold transition-all ${levelFilter === level.id ? 'bg-slate-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-3">
                  <level.icon size={14} />
                  {level.label}
                </div>
                {levelFilter === level.id && <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
              </button>
            ))}
          </div>
        </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md p-6 border-t border-slate-100">
          {user ? (
            <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4 border border-slate-100">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 font-black text-sm">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-black text-slate-900">{user.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <button onClick={logOut} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600">SIGN OUT</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button 
                onClick={signIn}
                className="flex w-full items-center justify-center gap-3 rounded-3xl bg-indigo-600 py-5 text-xs font-black text-white shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                SIGN IN WITH GOOGLE
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-72">
        <header className="sticky top-0 z-30 flex h-24 items-center justify-between border-b border-slate-200 bg-white/80 px-12 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowLocationSelector(!showLocationSelector)}
              className="flex items-center gap-3 rounded-2xl bg-slate-100 px-5 py-3 transition-all hover:bg-slate-200"
            >
              <MapPin size={16} className="text-indigo-600" />
              <span className="text-xs font-black text-slate-900">
                {settings.location.city?.trim() ? `${settings.location.city}, ${settings.location.state} (${STATE_ABBR[settings.location.state]})` : `${settings.location.state} (${STATE_ABBR[settings.location.state]})`}
              </span>
            </button>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search laws, bills, or topics..."
                className="h-12 w-80 rounded-2xl bg-slate-100 pl-12 pr-12 text-xs font-bold text-slate-900 outline-none ring-indigo-600 transition-all focus:ring-2"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                <kbd className="hidden sm:inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-black text-slate-500">⌘K</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-2xl p-3 text-slate-400 transition-all hover:bg-slate-100 hover:text-indigo-600"
            >
              <Bell size={22} />
              {notifications.some(n => !n.read) && (
                <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-white" />
              )}
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-2xl p-3 text-slate-400 transition-all hover:bg-slate-100 hover:text-indigo-600"
            >
              <Settings size={22} />
            </button>
          </div>
        </header>

        {/* Notifications Panel */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute right-12 top-24 z-50 w-96 rounded-[32px] border-2 border-slate-100 bg-white p-6 shadow-2xl shadow-indigo-100"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-950">Notifications</h3>
                <button 
                  onClick={handleClearNotifications}
                  className="text-[10px] font-bold text-slate-400 hover:text-indigo-600"
                >
                  CLEAR ALL
                </button>
              </div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleMarkNotificationRead(n.id)}
                      className={`cursor-pointer rounded-2xl p-4 transition-all ${n.read ? 'bg-slate-50' : 'bg-indigo-50 ring-1 ring-indigo-100'}`}
                    >
                      <p className="text-xs font-bold text-slate-900">{n.message}</p>
                      <p className="mt-1 text-[10px] font-bold text-slate-400">{n.date}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <Bell size={32} className="mx-auto mb-4 opacity-10" />
                    <p className="text-xs font-bold">No new notifications</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/20 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-lg rounded-[40px] bg-white p-10 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-black tracking-tight text-indigo-950">App Settings</h3>
                  <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-indigo-600">
                    <XCircle size={24} />
                  </button>
                </div>
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-indigo-950">High Contrast</p>
                      <p className="text-xs font-bold text-slate-400">Improve visibility for text.</p>
                    </div>
                    <button 
                      onClick={() => handleUpdateSettings({ highContrast: !settings.highContrast })}
                      className={`h-8 w-14 rounded-full transition-all ${settings.highContrast ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                      <div className={`h-6 w-6 rounded-full bg-white transition-all ${settings.highContrast ? 'ml-7' : 'ml-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-indigo-950">Text Size</p>
                      <p className="text-xs font-bold text-slate-400">Adjust the font size for better readability.</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                      {(['extra-small', 'small', 'medium', 'large', 'extra-large'] as const).map((size) => {
                        const labelMap: Record<string, string> = {
                          'extra-small': 'xs',
                          'small': 'sm',
                          'medium': 'md',
                          'large': 'lg',
                          'extra-large': 'xl'
                        };
                        return (
                          <button
                            key={size}
                            onClick={() => handleUpdateSettings({ fontSize: size })}
                            className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${settings.fontSize === size ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
                          >
                            {labelMap[size]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-indigo-950">Underline Links</p>
                      <p className="text-xs font-bold text-slate-400">Highlight interactive elements.</p>
                    </div>
                    <button 
                      onClick={() => handleUpdateSettings({ underlineLinks: !settings.underlineLinks })}
                      className={`h-8 w-14 rounded-full transition-all ${settings.underlineLinks ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                      <div className={`h-6 w-6 rounded-full bg-white transition-all ${settings.underlineLinks ? 'ml-7' : 'ml-1'}`} />
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="mt-10 w-full rounded-2xl bg-indigo-600 py-5 text-sm font-black text-white shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02]"
                >
                  SAVE & CLOSE
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="px-12 py-10">
          <AnimatePresence>
            {scrollProgress > 0.1 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-200 transition-transform active:scale-95"
              >
                <ChevronUp size={24} />
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showLocationSelector && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                className="mb-8 relative z-40"
              >
                <LocationSelector 
                  initialState={settings.location.state}
                  initialCity={settings.location.city}
                  initialLanguage={settings.language}
                  initialInterest={settings.interests[0] || 'all'}
                  onLocationChange={(state, city, language) => {
                    handleLocationChange(state, city, language);
                    setShowLocationSelector(false);
                  }}
                  onInterestChange={handlePrimaryInterestChange}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comparison Selection Indicator */}
          <AnimatePresence>
            {lawsToCompare.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 rounded-[32px] bg-indigo-950 p-4 pr-8 text-white shadow-2xl shadow-indigo-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-4">
                    {lawsToCompare.map((law, idx) => (
                      <div key={law.id} className={`flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-indigo-950 text-xs font-black ${idx === 0 ? 'bg-indigo-600' : 'bg-amber-500'}`}>
                        {law.title[0]}
                      </div>
                    ))}
                    {lawsToCompare.length < 2 && (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-indigo-950 bg-slate-800 text-slate-500">
                        +
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-black tracking-tight">Compare Legislation</p>
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                      {lawsToCompare.length === 1 ? "Select 1 more law to compare" : "2 laws selected"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setLawsToCompare([])}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
                  >
                    CLEAR
                  </button>
                  {lawsToCompare.length === 2 && (
                    <button 
                      onClick={() => setActiveTab('feed')} // Just to ensure we're on a tab where it shows
                      className="rounded-xl bg-indigo-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
                    >
                      COMPARE NOW
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'feed' && (
              <motion.div 
                key="feed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter text-indigo-950">
                      {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}!
                    </h2>
                    <p className="mt-2 text-sm font-bold flex items-center gap-2 text-slate-400">
                      Here's your community-impact feed for
                      {STATE_FLAGS[settings.location.state] && (
                        <img src={`https://flagcdn.com/w20/${STATE_FLAGS[settings.location.state]}.png`} srcSet={`https://flagcdn.com/w40/${STATE_FLAGS[settings.location.state]}.png 2x`} width="20" alt={`${settings.location.state} flag`} className="rounded-sm shadow-sm" />
                      )}
                      <span>
                        {settings.location.city?.trim() ? `${settings.location.city}, ${settings.location.state} (${STATE_ABBR[settings.location.state]})` : `${settings.location.state} (${STATE_ABBR[settings.location.state]})`}.
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {primaryInterest !== 'all' && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                        PRIMARY: #{primaryInterest.toUpperCase()}
                      </div>
                    )}
                    <select
                      value={interestFilter}
                      onChange={(e) => setInterestFilter(e.target.value)}
                      className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2 pr-8 text-xs font-black text-slate-600 transition-all hover:border-indigo-600 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-50"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                    >
                      <option value="all">ALL TOPICS</option>
                      {HYBRID_FILTER_TOPICS.map(topic => (
                        <option key={topic} value={topic.toLowerCase()}>
                          {topic.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <LawFeed 
                  laws={paginatedLaws}
                  allLaws={prioritizedFilteredLaws}
                  isLoading={isLoading} 
                  error={error} 
                  onSave={handleSaveLaw} 
                  onVote={handleVote} 
                  onComment={handleComment}
                  onPollVote={handlePollVote}
                  onCompare={handleCompare}
                  comparingIds={lawsToCompare.map(l => l.id)}
                  onToggleFollowTopic={handleToggleFollowTopic}
                  followedTopics={userProfile?.followedTopics}
                  totalCount={prioritizedFilteredLaws.length}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </motion.div>
            )}

            {activeTab === 'saved' && (
              <motion.div 
                key="saved"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-10">
                  <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Saved Content</h2>
                  <p className="mt-2 font-bold text-slate-400">Keep track of the legislation that matters most to you.</p>
                </div>
                {savedLaws.length > 0 ? (
                  <LawFeed 
                    laws={paginatedSavedLaws}
                    allLaws={savedLaws}
                    isLoading={false} 
                    error={null} 
                    onSave={handleSaveLaw} 
                    onVote={handleVote} 
                    onComment={handleComment}
                    onPollVote={handlePollVote}
                    onCompare={handleCompare}
                    comparingIds={lawsToCompare.map(l => l.id)}
                    totalCount={savedLaws.length}
                    currentPage={savedPage}
                    totalPages={savedTotalPages}
                    onPageChange={setSavedPage}
                  />
                ) : (
                  <div className="flex h-96 flex-col items-center justify-center gap-6 rounded-[40px] border-4 border-dashed border-slate-100 bg-white text-slate-400">
                    <Bookmark size={64} className="opacity-10" />
                    <div className="text-center">
                      <p className="text-xl font-black text-slate-900">No saved laws yet</p>
                      <p className="mt-1 font-bold">Start exploring the feed to bookmark important legislation.</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('feed')}
                      className="rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-100 transition-all hover:scale-105"
                    >
                      EXPLORE FEED
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'digest' && (
              <motion.div 
                key="digest"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="mb-10">
                  <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Weekly Digest</h2>
                  <p className="mt-2 font-bold text-slate-400">A summary of recent legislative activity affecting daily life, rights, identity, and community.</p>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  <div className="rounded-[40px] bg-indigo-600 p-10 text-white shadow-xl shadow-indigo-100">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <Zap size={24} />
                    </div>
                    <h3 className="text-4xl font-black tracking-tighter">12</h3>
                    <p className="mt-2 font-bold text-indigo-100 uppercase tracking-widest text-[10px]">New Proposals</p>
                  </div>
                  <div className="rounded-[40px] bg-emerald-600 p-10 text-white shadow-xl shadow-emerald-100">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <CheckCircle size={24} />
                    </div>
                    <h3 className="text-4xl font-black tracking-tighter">4</h3>
                    <p className="mt-2 font-bold text-emerald-100 uppercase tracking-widest text-[10px]">Passed Laws</p>
                  </div>
                  <div className="rounded-[40px] bg-amber-500 p-10 text-white shadow-xl shadow-amber-100">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-4xl font-black tracking-tighter">8</h3>
                    <p className="mt-2 font-bold text-amber-100 uppercase tracking-widest text-[10px]">Updates</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-2xl font-black tracking-tight text-indigo-950">Top Stories This Week</h3>
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {[
                      { id: 'story-1', title: 'Interpreter Access Ordinance Proposed', category: 'Language Access', status: 'proposed', level: 'city', date: '2 days ago', impact: 'Could expand access to city services for residents who do not use English as a primary language.', simplifiedSummary: 'A city ordinance would require key public-facing agencies to provide translated forms and interpreter support.' },
                      { id: 'story-2', title: 'State Education Budget Increase Passed', category: 'Education', status: 'passed', level: 'state', date: '4 days ago', impact: 'Significant funding boost for public schools and a stronger equity mandate for underserved districts.', simplifiedSummary: 'The state legislature has approved a 15% increase in education funding with an emphasis on schools serving historically under-resourced communities.' },
                      { id: 'story-3', title: 'Community Arts Grant Expansion Approved', category: 'Arts & Culture Funding', status: 'updated', level: 'city', date: '1 week ago', impact: 'Adds support for local artists, neighborhood festivals, and cultural institutions.', simplifiedSummary: 'A new municipal package expands grants for arts organizations, community performances, and cultural preservation projects.' },
                      { id: 'story-4', title: 'Immigration Legal Aid Program Expanded', category: 'Immigration', status: 'updated', level: 'state', date: '5 days ago', impact: 'More resources for new residents and families seeking legal aid and language support.', simplifiedSummary: 'The state has doubled the budget for its legal aid program for immigrants and mixed-status households.' }
                    ].map((story) => (
                      <LawCard 
                        key={story.id} 
                        law={story as any} 
                        onSave={handleSaveLaw} 
                        onVote={handleVote} 
                        onComment={handleComment}
                        onPollVote={handlePollVote}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-12">
                    {/* Situation Section */}
                    <section className="rounded-[40px] bg-white p-10 shadow-xl shadow-slate-200/50">
                      <div className="mb-8 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                          <MessageSquare size={24} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black tracking-tight text-indigo-950">How This Affects Me Or My Community</h3>
                          <p className="font-bold text-slate-400 text-sm">Save personal or cultural context so the AI can explain bills in terms that fit your real life.</p>
                        </div>
                      </div>
                      <textarea 
                        className="w-full rounded-3xl border-2 border-slate-100 bg-slate-50 p-6 text-sm font-bold text-slate-900 outline-none ring-indigo-600 transition-all focus:ring-2"
                        rows={4}
                        placeholder="e.g., I'm an international student working part-time in San Francisco and my family relies on translated services. How do these laws affect me and my community?"
                        value={userProfile?.situation || ''}
                        onChange={(e) => setUserProfile(prev => prev ? { ...prev, situation: e.target.value } : null)}
                      />
                      <button 
                        onClick={() => handleSaveSituation(userProfile?.situation || '')}
                        className="mt-6 rounded-2xl bg-indigo-600 px-10 py-5 text-sm font-black text-white shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02]"
                      >
                        UPDATE MY CONTEXT
                      </button>
                    </section>

                    {/* Followed Topics */}
                    <section className="rounded-[40px] bg-white p-10 shadow-xl shadow-slate-200/50">
                      <div className="mb-8 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                          <TrendingUp size={24} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black tracking-tight text-indigo-950">Followed Topics And Cultural Impact Tags</h3>
                          <p className="font-bold text-slate-400 text-sm">Track standard civic issues and identity-specific community impacts in one place.</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {HYBRID_PROFILE_TOPICS.map(topic => (
                          <button 
                            key={topic}
                            onClick={() => handleToggleFollowTopic(topic)}
                            className={`flex items-center gap-3 rounded-2xl border-2 px-6 py-4 text-sm font-black transition-all ${userProfile?.followedTopics.includes(topic) ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-600 hover:text-indigo-600'}`}
                          >
                            {topic}
                            {userProfile?.followedTopics.includes(topic) && <ChevronRight size={14} />}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-12">
                    {/* Representatives */}
                    <section className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                          <Users size={24} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black tracking-tight text-indigo-950">Your Representatives</h3>
                          <p className="font-bold text-slate-400 text-sm">Direct connection to your elected officials.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                        {[
                          {
                            name: 'Jeff Jackson',
                            office: 'U.S. Representative',
                            party: 'Democrat',
                            photoUrl: 'https://www.congress.gov/img/member/j000308_200.jpg',
                            emails: ['contact@jackson.house.gov'],
                            phones: ['(202) 225-5634'],
                            urls: ['https://jeffjackson.house.gov'],
                            channels: [{ type: 'Twitter', id: 'JeffJacksonNC' }, { type: 'Facebook', id: 'JeffJacksonNC' }]
                          },
                          {
                            name: 'Thom Tillis',
                            office: 'U.S. Senator',
                            party: 'Republican',
                            photoUrl: 'https://www.congress.gov/img/member/t000476_200.jpg',
                            emails: ['contact@tillis.senate.gov'],
                            phones: ['(202) 224-6342'],
                            urls: ['https://www.tillis.senate.gov'],
                            channels: [{ type: 'Twitter', id: 'SenThomTillis' }]
                          }
                        ].map((rep, idx) => (
                          <RepresentativeCard key={idx} representative={rep as any} />
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'map' && (
              <motion.div 
                key="map"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <MapView 
                  laws={laws} 
                  onSelectLaw={(law) => {
                    setActiveTab('feed');
                  }} 
                />
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AnalyticsView laws={laws} collections={[]} />
              </motion.div>
            )}

            {activeTab === 'community' && (
              <motion.div 
                key="community"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <CommunityView
                  state={settings.location.state}
                  city={settings.location.city}
                  user={user}
                  userProfile={userProfile}
                />
              </motion.div>
            )}

            {activeTab === 'roadmap' && (
              <motion.div 
                key="roadmap"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <RoadmapView />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info Section - Bento Grid */}
        <div className="mt-24 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-[40px] bg-indigo-600 p-10 text-white shadow-2xl shadow-indigo-200 md:col-span-2">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-3xl font-black tracking-tighter">Know The Laws That Shape Daily Life And Culture.</h3>
            <p className="mt-4 font-bold text-indigo-100">CulturAct uses AI to explain legislation affecting housing, work, education, health, language, heritage, identity, land, and belonging in plain language.</p>
            <div className="mt-8 flex gap-4">
              <div className="rounded-2xl bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest">Privacy First</div>
              <div className="rounded-2xl bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest">AI Powered</div>
            </div>
          </div>

          <div className="rounded-[40px] bg-white p-10 shadow-xl shadow-slate-200/50">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <TrendingUp size={28} />
            </div>
            <h4 className="text-xl font-black tracking-tight text-indigo-950">Trending</h4>
            <p className="mt-2 text-sm font-bold text-slate-400">Housing, immigration, and language access are the top topics in your area this week.</p>
          </div>

          <div className="rounded-[40px] bg-slate-900 p-10 text-white shadow-xl">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Zap size={28} className="text-amber-400" />
            </div>
            <h4 className="text-xl font-black tracking-tight">Quick Action</h4>
            <p className="mt-2 text-sm font-bold text-slate-400">3 new bills matching your civic and cultural interests need your feedback.</p>
            <button className="mt-6 text-xs font-black text-amber-400 hover:underline">VIEW ACTIONS →</button>
          </div>
        </div>

        <footer className="mt-32 border-t border-slate-100 py-16 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">© 2026 CulturAct. Know the laws that shape your community.</p>
          <p className="mt-4 mx-auto max-w-2xl text-[10px] font-bold text-slate-300">CulturAct provides AI-generated summaries for informational purposes. Always consult with a legal professional for specific legal advice.</p>
        </footer>
      </main>

      <AskAIFloatingButton />
      <AILawyer laws={laws} userSituation={userProfile?.situation} />

      {lawsToCompare.length === 2 && (
        <CompareLaws 
          law1={lawsToCompare[0]} 
          law2={lawsToCompare[1]} 
          onClose={() => setLawsToCompare([])} 
        />
      )}
    </div>
  );
}
