import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bookmark, LayoutGrid, MessageSquare, Scale, LayoutDashboard, Map, User as UserIcon, MapPin, Bell, Settings, Search, Filter, ChevronRight, TrendingUp, Globe, Building2, Users, Zap, CheckCircle, AlertTriangle, ShieldCheck, History, BarChart3, XCircle } from 'lucide-react';
import LocationSelector from './components/LocationSelector';
import LawFeed from './components/LawFeed';
import LawCard from './components/LawCard';
import CompareLaws from './components/CompareLaws';
import MapView from './components/MapView';
import RoadmapView from './components/RoadmapView';
import AnalyticsView from './components/AnalyticsView';
import RepresentativeCard from './components/RepresentativeCard';
import AILawyer from './components/AILawyer';
import { BookmarkCollection, Comment, HearingEvent, Law, Notification, Representative, UserProfile, UserSettings } from './types';
import { fetchHearingsForLocation, fetchLaws, fetchRepresentativesForAddress, moderateComment } from './services/geminiService';
import { auth, db, signIn, logOut, onAuthStateChanged, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('civiclens_settings');
    return saved ? JSON.parse(saved) : {
      highContrast: false,
      largeFont: false,
      language: 'English',
      location: { state: 'California', city: 'San Francisco' },
      interests: [],
    };
  });
  const [laws, setLaws] = useState<Law[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [hearingEvents, setHearingEvents] = useState<HearingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'saved' | 'profile' | 'map' | 'digest' | 'roadmap' | 'analytics'>('feed');
  const [levelFilter, setLevelFilter] = useState<'all' | 'federal' | 'state' | 'county' | 'city'>('all');
  const [interestFilter, setInterestFilter] = useState<string>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [lawsToCompare, setLawsToCompare] = useState<Law[]>([]);
  const [selectedLawId, setSelectedLawId] = useState<string | null>(null);
  const [bookmarkCollections, setBookmarkCollections] = useState<BookmarkCollection[]>(() => {
    const saved = localStorage.getItem('civiclens_collections');
    return saved ? JSON.parse(saved) : [{ id: 'default', name: 'My Civic Watchlist', lawIds: [] }];
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        return;
      }
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
            lastUpdated: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', currentUser.uid), newProfile);
          setUserProfile(newProfile);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
      }
    });
    return () => unsubscribe();
  }, [settings.interests, settings.location]);

  const loadLaws = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cacheKey = `${settings.location.state}_${settings.location.city}_${settings.language}`;
      const cacheValue = localStorage.getItem(`civiclens_cache_${cacheKey}`);
      const cacheLimit = 4 * 60 * 60 * 1000;
      let data: Law[] = [];
      if (cacheValue) {
        const parsed = JSON.parse(cacheValue);
        if (Date.now() - new Date(parsed.lastUpdated || 0).getTime() < cacheLimit) {
          data = parsed.laws || [];
        }
      }
      if (data.length === 0) {
        data = await fetchLaws(settings.location.state, settings.location.city, settings.language, userProfile?.situation);
        if (data.length > 0) {
          localStorage.setItem(`civiclens_cache_${cacheKey}`, JSON.stringify({ laws: data, lastUpdated: new Date().toISOString() }));
        }
      }
      if (data.length === 0) {
        setError('No laws found for your location. Try adjusting your settings.');
      }
      const savedIds = JSON.parse(localStorage.getItem('civiclens_saved') || '[]');
      const hydratedLaws = data.map((law) => ({ ...law, saved: savedIds.includes(law.id) }));
      setLaws(hydratedLaws);
      setSelectedLawId((prev) => prev && hydratedLaws.some((law) => law.id === prev) ? prev : null);
    } catch (err) {
      setError('Failed to load laws. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [settings.location, settings.language, userProfile?.situation]);

  useEffect(() => {
    loadLaws();
  }, [loadLaws]);

  useEffect(() => {
    localStorage.setItem('civiclens_settings', JSON.stringify(settings));
    localStorage.setItem('civiclens_collections', JSON.stringify(bookmarkCollections));
    document.body.classList.toggle('high-contrast', settings.highContrast);
    document.body.classList.toggle('large-font', settings.largeFont);
  }, [settings, bookmarkCollections]);

  useEffect(() => {
    const address = `${settings.location.city}, ${settings.location.state}`;
    fetchRepresentativesForAddress(address, settings.location.state, laws).then(setRepresentatives).catch(() => setRepresentatives([]));
    fetchHearingsForLocation(settings.location.state, settings.location.city).then(setHearingEvents).catch(() => setHearingEvents([]));
  }, [settings.location.city, settings.location.state, laws]);

  useEffect(() => {
    if (laws.length === 0) return;
    const actionable = laws.filter((law) => law.status === 'proposed' && (law.saved || userProfile?.followedTopics.some((topic) => law.category.toLowerCase().includes(topic.toLowerCase()))));
    const auto = actionable.slice(0, 3).map((law) => ({
      id: `alert-${law.id}`,
      title: 'Action Needed',
      message: `${law.title} is active and matches your saved laws or followed topics.`,
      date: law.date,
      read: false,
      type: 'alert' as const,
      lawId: law.id,
    }));
    setNotifications((prev) => {
      const existing = new Set(prev.map((item) => item.id));
      return [...prev, ...auto.filter((item) => !existing.has(item.id))];
    });
  }, [laws, userProfile?.followedTopics]);

  const handleSaveSituation = async (situation: string) => {
    if (!user) return signIn();
    try {
      const updated = { ...userProfile!, situation, lastUpdated: new Date().toISOString() };
      await setDoc(doc(db, 'users', user.uid), updated);
      setUserProfile(updated);
      loadLaws();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleToggleFollowTopic = async (topic: string) => {
    if (!user) return signIn();
    try {
      const topics = userProfile?.followedTopics.includes(topic)
        ? userProfile.followedTopics.filter((item) => item !== topic)
        : [...(userProfile?.followedTopics || []), topic];
      const updated = { ...userProfile!, followedTopics: topics, lastUpdated: new Date().toISOString() };
      await setDoc(doc(db, 'users', user.uid), updated);
      setUserProfile(updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleSaveLaw = (id: string) => {
    setLaws((prev) => {
      const updated = prev.map((law) => law.id === id ? { ...law, saved: !law.saved } : law);
      localStorage.setItem('civiclens_saved', JSON.stringify(updated.filter((law) => law.saved).map((law) => law.id)));
      return updated;
    });
  };

  const handleVote = (id: string, type: 'support' | 'oppose') => {
    setLaws((prev) => prev.map((law) => {
      if (law.id !== id) return law;
      const isRemoving = law.userVote === type;
      const newVote = isRemoving ? undefined : type;
      const votes = { support: law.votes?.support || 0, oppose: law.votes?.oppose || 0 };
      if (isRemoving) votes[type] = Math.max(0, votes[type] - 1);
      else {
        if (law.userVote) votes[law.userVote] = Math.max(0, votes[law.userVote] - 1);
        votes[type] += 1;
      }
      return { ...law, userVote: newVote, votes };
    }));
  };

  const handleComment = async (id: string, text: string) => {
    const moderation = await moderateComment(text);
    const comment: Comment = {
      id: Math.random().toString(36).slice(2, 9),
      userId: user?.uid || 'user-1',
      userName: user?.email?.split('@')[0] || 'You',
      text,
      date: new Date().toLocaleDateString(),
      status: moderation.approved ? 'published' : 'flagged',
      moderationNote: moderation.reason,
    };
    setLaws((prev) => prev.map((law) => law.id === id ? { ...law, comments: [comment, ...(law.comments || [])] } : law));
  };

  const handleAddImpactStory = (id: string, text: string) => {
    setLaws((prev) => prev.map((law) => law.id === id ? {
      ...law,
      impactStories: [{
        id: `story-${Math.random().toString(36).slice(2, 9)}`,
        author: user?.email?.split('@')[0] || 'Community Member',
        text,
        date: new Date().toLocaleDateString(),
        verified: Boolean(user),
      }, ...(law.impactStories || [])],
    } : law));
  };

  const handleSaveToCollection = (id: string, collectionId: string) => {
    setBookmarkCollections((prev) => prev.map((collection) => {
      if (collection.id !== collectionId) return collection;
      return {
        ...collection,
        lawIds: collection.lawIds.includes(id) ? collection.lawIds.filter((lawId) => lawId !== id) : [...collection.lawIds, id],
      };
    }));
  };

  const handlePollVote = (id: string, optionLabel: string) => {
    setLaws((prev) => prev.map((law) => {
      if (law.id !== id || !law.poll) return law;
      const options = law.poll.options.map((opt) => {
        if (opt.label === optionLabel) return { ...opt, count: opt.count + 1 };
        if (opt.label === law.poll?.userChoice) return { ...opt, count: Math.max(0, opt.count - 1) };
        return opt;
      });
      return { ...law, poll: { ...law.poll, options, userChoice: optionLabel } };
    }));
  };

  const filteredLaws = useMemo(() => laws.filter((law) => {
    const matchesLevel = levelFilter === 'all' || law.level === levelFilter;
    const matchesInterest = interestFilter === 'all' || law.category.toLowerCase().includes(interestFilter.toLowerCase());
    return matchesLevel && matchesInterest;
  }), [laws, levelFilter, interestFilter]);
  const feedLaws = useMemo(() => {
    if (!selectedLawId) return filteredLaws;
    const selected = filteredLaws.find((law) => law.id === selectedLawId);
    if (!selected) return filteredLaws;
    return [selected, ...filteredLaws.filter((law) => law.id !== selectedLawId)];
  }, [filteredLaws, selectedLawId]);
  const savedLaws = laws.filter((law) => law.saved);
  const trendingTopic = laws.length > 0
    ? Object.entries(laws.reduce((acc, law) => ({ ...acc, [law.category]: (acc[law.category] || 0) + 1 }), {} as Record<string, number>)).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || 'Housing'
    : 'Housing';
  const actionCount = laws.filter((law) => law.status === 'proposed' && (law.saved || interestFilter === 'all' || law.category.toLowerCase().includes(interestFilter.toLowerCase()))).length;
  const collectionLaws = bookmarkCollections.map((collection) => ({ ...collection, laws: laws.filter((law) => collection.lawIds.includes(law.id)) }));

  return (
    <div className={`min-h-screen bg-background-color text-text-primary ${settings.largeFont ? 'text-lg' : 'text-base'}`}>
      <aside className="fixed left-0 top-0 z-40 h-screen w-72 border-r border-slate-200 bg-white p-8">
        <div className="mb-12 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white"><Scale size={28} /></div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-indigo-950">CIVICLENS</h1>
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400">DEMOCRACY 2.0</p>
          </div>
        </div>
        <nav className="space-y-3">
          {[
            ['feed', LayoutDashboard, 'LEGISLATIVE FEED'],
            ['saved', Bookmark, 'SAVED LAWS'],
            ['map', Map, 'MAP VIEW'],
            ['digest', Zap, 'WEEKLY DIGEST'],
            ['profile', UserIcon, 'MY PROFILE'],
            ['roadmap', History, 'ROADMAP'],
            ['analytics', BarChart3, 'ANALYTICS'],
          ].map(([id, Icon, label]) => (
            <button key={id} onClick={() => setActiveTab(id as any)} className={`flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-sm font-black ${activeTab === id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}>
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-12 border-t border-slate-100 pt-10">
          <h3 className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"><Filter size={12} />Quick Filters</h3>
          {[
            ['all', 'All Levels', Globe],
            ['federal', 'Federal', Building2],
            ['state', 'State', MapPin],
            ['county', 'County', LayoutGrid],
            ['city', 'City', Building2],
          ].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setLevelFilter(id as any)} className={`mb-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold ${levelFilter === id ? 'bg-slate-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
        <div className="absolute bottom-8 left-8 right-8">
          {user ? (
            <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/10 font-black text-indigo-600">{user.email?.[0].toUpperCase()}</div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-black text-slate-900">{user.email}</p>
                <button onClick={logOut} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600">SIGN OUT</button>
              </div>
            </div>
          ) : (
            <button onClick={signIn} className="flex w-full items-center justify-center gap-3 rounded-3xl bg-indigo-600 py-5 text-xs font-black text-white">SIGN IN WITH GOOGLE</button>
          )}
        </div>
      </aside>

      <main className="pl-72">
        <header className="sticky top-0 z-30 flex h-24 items-center justify-between border-b border-slate-200 bg-white/80 px-12 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <button onClick={() => setShowLocationSelector((prev) => !prev)} className="flex items-center gap-3 rounded-2xl bg-slate-100 px-5 py-3">
              <MapPin size={16} className="text-indigo-600" />
              <span className="text-xs font-black text-slate-900">{settings.location.city}, {settings.location.state}</span>
            </button>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search laws, bills, or topics..." className="h-12 w-80 rounded-2xl bg-slate-100 pl-12 pr-4 text-xs font-bold text-slate-900 outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-8">
            <button onClick={() => setShowNotifications((prev) => !prev)} className="relative rounded-2xl p-3 text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
              <Bell size={22} />
              {notifications.some((item) => !item.read) && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-white" />}
            </button>
            <button onClick={() => setShowSettings((prev) => !prev)} className="rounded-2xl p-3 text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
              <Settings size={22} />
            </button>
          </div>
        </header>

        <AnimatePresence>
          {showNotifications && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute right-12 top-24 z-50 w-96 rounded-[32px] border-2 border-slate-100 bg-white p-6 shadow-2xl shadow-indigo-100">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-950">Notifications</h3>
                <button onClick={() => setNotifications([])} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600">CLEAR ALL</button>
              </div>
              <div className="space-y-4">
                {notifications.map((n) => (
                  <div key={n.id} className={`rounded-2xl p-4 ${n.read ? 'bg-slate-50' : 'bg-indigo-50 ring-1 ring-indigo-100'}`}>
                    <p className="text-xs font-bold text-slate-900">{n.message}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">{n.date}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/20 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-lg rounded-[40px] bg-white p-10 shadow-2xl">
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-black tracking-tight text-indigo-950">App Settings</h3>
                  <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-indigo-600"><XCircle size={24} /></button>
                </div>
                <div className="space-y-6">
                  <button onClick={() => setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }))} className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-5 py-4 font-black text-slate-700">High Contrast <span>{settings.highContrast ? 'On' : 'Off'}</span></button>
                  <button onClick={() => setSettings((prev) => ({ ...prev, largeFont: !prev.largeFont }))} className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-5 py-4 font-black text-slate-700">Large Font <span>{settings.largeFont ? 'On' : 'Off'}</span></button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="px-12 py-10">
          <AnimatePresence>
            {showLocationSelector && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8 overflow-hidden">
                <LocationSelector
                  initialState={settings.location.state}
                  initialCity={settings.location.city}
                  initialLanguage={settings.language}
                  onLocationChange={(state, city, language) => {
                    setSettings((prev) => ({ ...prev, location: { state, city }, language }));
                    setShowLocationSelector(false);
                  }}
                  onInterestChange={(interest) => setInterestFilter(interest)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'feed' && (
              <motion.div key="feed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Legislative Feed</h2>
                    <p className="mt-2 font-bold text-slate-400">Real-time updates on laws affecting {settings.location.city}.</p>
                  </div>
                </div>
                <LawFeed laws={feedLaws} allLaws={laws} isLoading={isLoading} error={error} highlightedLawId={selectedLawId} onSave={handleSaveLaw} onVote={handleVote} onComment={handleComment} onPollVote={handlePollVote} onAddImpactStory={handleAddImpactStory} onSaveToCollection={handleSaveToCollection} collections={bookmarkCollections} onCompare={(law) => setLawsToCompare((prev) => prev.find((item) => item.id === law.id) ? prev.filter((item) => item.id !== law.id) : prev.length >= 2 ? [prev[1], law] : [...prev, law])} comparingIds={lawsToCompare.map((law) => law.id)} onToggleFollowTopic={handleToggleFollowTopic} followedTopics={userProfile?.followedTopics || []} />
              </motion.div>
            )}

            {activeTab === 'saved' && (
              <motion.div key="saved" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="mb-10">
                  <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Saved Content</h2>
                  <p className="mt-2 font-bold text-slate-400">Keep track of the legislation that matters most to you.</p>
                </div>
                <LawFeed laws={savedLaws} allLaws={laws} isLoading={false} error={null} onSave={handleSaveLaw} onVote={handleVote} onComment={handleComment} onPollVote={handlePollVote} onAddImpactStory={handleAddImpactStory} onSaveToCollection={handleSaveToCollection} collections={bookmarkCollections} onCompare={(law) => setLawsToCompare((prev) => prev.find((item) => item.id === law.id) ? prev.filter((item) => item.id !== law.id) : prev.length >= 2 ? [prev[1], law] : [...prev, law])} comparingIds={lawsToCompare.map((law) => law.id)} />
              </motion.div>
            )}

            {activeTab === 'digest' && (
              <motion.div key="digest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  <div className="rounded-[40px] bg-indigo-600 p-10 text-white"><Zap size={24} /><h3 className="mt-6 text-4xl font-black">{laws.filter((law) => law.status === 'proposed').length}</h3><p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-indigo-100">New Proposals</p></div>
                  <div className="rounded-[40px] bg-emerald-600 p-10 text-white"><CheckCircle size={24} /><h3 className="mt-6 text-4xl font-black">{laws.filter((law) => law.status === 'passed').length}</h3><p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-100">Passed Laws</p></div>
                  <div className="rounded-[40px] bg-amber-500 p-10 text-white"><AlertTriangle size={24} /><h3 className="mt-6 text-4xl font-black">{laws.filter((law) => law.status === 'updated').length}</h3><p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-100">Updates</p></div>
                </div>
                <div className="rounded-[40px] border-2 border-slate-100 bg-white p-10 shadow-xl shadow-slate-200/40">
                  <h3 className="text-2xl font-black tracking-tight text-indigo-950">Upcoming Hearings</h3>
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {(hearingEvents.length > 0 ? hearingEvents : laws.flatMap((law) => law.hearings || []).slice(0, 4)).map((hearing) => (
                      <div key={hearing.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{hearing.type}</p>
                        <p className="mt-2 text-sm font-black text-slate-900">{hearing.title}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{hearing.date} · {hearing.venue}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  {laws.slice(0, 2).map((story) => (
                    <LawCard key={story.id} law={story} onSave={handleSaveLaw} onVote={handleVote} onComment={handleComment} onPollVote={handlePollVote} onAddImpactStory={handleAddImpactStory} onSaveToCollection={handleSaveToCollection} collections={bookmarkCollections} relatedLaws={laws.filter((law) => (story.relatedLawIds || []).includes(law.id))} />
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 gap-12 lg:grid-cols-3">
                <div className="space-y-12 lg:col-span-2">
                  <section className="rounded-[40px] bg-white p-10 shadow-xl shadow-slate-200/50">
                    <h3 className="text-2xl font-black tracking-tight text-indigo-950">Ask About Your Situation</h3>
                    <textarea className="mt-6 w-full rounded-3xl border-2 border-slate-100 bg-slate-50 p-6 text-sm font-bold text-slate-900 outline-none" rows={4} value={userProfile?.situation || ''} onChange={(e) => setUserProfile((prev) => prev ? { ...prev, situation: e.target.value } : prev)} />
                    <button onClick={() => handleSaveSituation(userProfile?.situation || '')} className="mt-6 rounded-2xl bg-indigo-600 px-10 py-5 text-sm font-black text-white">UPDATE MY CONTEXT</button>
                  </section>
                  <section className="rounded-[40px] bg-white p-10 shadow-xl shadow-slate-200/50">
                    <h3 className="text-2xl font-black tracking-tight text-indigo-950">Followed Topics</h3>
                    <div className="mt-6 flex flex-wrap gap-4">
                      {['Housing', 'Immigration', 'Labor', 'Education', 'Health', 'Environment', 'Taxes', 'Transport'].map((topic) => (
                        <button key={topic} onClick={() => handleToggleFollowTopic(topic)} className={`rounded-2xl border-2 px-6 py-4 text-sm font-black ${userProfile?.followedTopics.includes(topic) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-white text-slate-500'}`}>
                          {topic}
                          {userProfile?.followedTopics.includes(topic) && <ChevronRight size={14} className="ml-2 inline" />}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
                <div className="space-y-12">
                  <section className="space-y-8">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight text-indigo-950">Your Representatives</h3>
                      <p className="font-bold text-slate-400 text-sm">Direct connection to your elected officials.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      {representatives.map((rep) => <RepresentativeCard key={rep.id} representative={rep} />)}
                    </div>
                  </section>
                  <section className="rounded-[40px] bg-white p-10 shadow-xl shadow-slate-200/50">
                    <h3 className="text-2xl font-black tracking-tight text-indigo-950">Collective Bookmarks</h3>
                    <div className="mt-6 space-y-4">
                      {collectionLaws.map((collection) => (
                        <div key={collection.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-black text-slate-900">{collection.name}</p>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{collection.laws.length} laws</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {activeTab === 'map' && <motion.div key="map" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><MapView laws={laws} onSelectLaw={(law) => { setSelectedLawId(law.id); setActiveTab('feed'); }} /></motion.div>}
            {activeTab === 'analytics' && <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><AnalyticsView laws={laws} collections={bookmarkCollections} /></motion.div>}
            {activeTab === 'roadmap' && <motion.div key="roadmap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><RoadmapView /></motion.div>}
          </AnimatePresence>
        </div>

        <div className="mt-24 grid grid-cols-1 gap-8 px-12 md:grid-cols-3">
          <div className="rounded-[40px] bg-indigo-600 p-10 text-white shadow-2xl shadow-indigo-200 md:col-span-2">
            <ShieldCheck size={28} />
            <h3 className="mt-6 text-3xl font-black tracking-tighter">Your Rights, Simplified.</h3>
            <p className="mt-4 font-bold text-indigo-100">CivicLens uses AI and official data sources to break down complex legal jargon into actionable insights for your specific situation.</p>
          </div>
          <div className="rounded-[40px] bg-white p-10 shadow-xl shadow-slate-200/50">
            <TrendingUp size={28} className="text-amber-600" />
            <h4 className="mt-6 text-xl font-black tracking-tight text-indigo-950">Trending</h4>
            <p className="mt-2 text-sm font-bold text-slate-400">{trendingTopic} is the #1 topic in your area this week.</p>
          </div>
          <div className="rounded-[40px] bg-slate-900 p-10 text-white shadow-xl">
            <Zap size={28} className="text-amber-400" />
            <h4 className="mt-6 text-xl font-black tracking-tight">Quick Action</h4>
            <p className="mt-2 text-sm font-bold text-slate-400">{actionCount} active bills matching your interests or saved laws need your feedback.</p>
          </div>
        </div>
      </main>

      <AILawyer laws={laws} userSituation={userProfile?.situation} />
      {lawsToCompare.length === 2 && <CompareLaws law1={lawsToCompare[0]} law2={lawsToCompare[1]} onClose={() => setLawsToCompare([])} />}
    </div>
  );
}
