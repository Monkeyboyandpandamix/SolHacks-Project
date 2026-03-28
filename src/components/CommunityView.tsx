import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  CalendarDays,
  Loader2,
  MapPin,
  MessageSquare,
  Languages,
  House,
  Scale,
  Globe2,
  Send,
  ExternalLink,
  Phone,
  Clock3,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, signIn } from '../firebase';
import { CommunityEvent, CommunityResource, UserProfile } from '../types';
import { fetchCommunityEvents, fetchCommunityResources } from '../services/communityService';

interface CommunityViewProps {
  state: string;
  city: string;
  user: User | null;
  userProfile: UserProfile | null;
}

type ResourceCategory = 'translator' | 'shelter' | 'legal' | 'immigration';

interface NeighborhoodMessage {
  id: string;
  text: string;
  userName: string;
  userId: string;
  createdAt?: Date | null;
}

const resourceMeta: Record<ResourceCategory, { label: string; icon: React.ReactNode; accent: string }> = {
  translator: { label: 'Translators', icon: <Languages size={18} />, accent: 'text-sky-600 bg-sky-50' },
  shelter: { label: 'Shelters', icon: <House size={18} />, accent: 'text-emerald-600 bg-emerald-50' },
  legal: { label: 'Lawyers', icon: <Scale size={18} />, accent: 'text-indigo-600 bg-indigo-50' },
  immigration: { label: 'Immigration Help', icon: <Globe2 size={18} />, accent: 'text-amber-600 bg-amber-50' },
};

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const CommunityView: React.FC<CommunityViewProps> = ({ state, city, user, userProfile }) => {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [resourceCategory, setResourceCategory] = useState<ResourceCategory>('translator');
  const [resources, setResources] = useState<CommunityResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [messages, setMessages] = useState<NeighborhoodMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const locationLabel = city?.trim() ? `${city}, ${state}` : state;
  const roomId = useMemo(
    () => `${state}-${city || 'statewide'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    [city, state],
  );

  useEffect(() => {
    let cancelled = false;
    const loadEvents = async () => {
      setEventsLoading(true);
      setEventsError(null);
      try {
        const response = await fetchCommunityEvents(state, city);
        if (!cancelled) setEvents(response);
      } catch {
        if (!cancelled) setEventsError('Unable to load community events right now.');
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    };

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [city, state]);

  useEffect(() => {
    let cancelled = false;
    const loadResources = async () => {
      setResourcesLoading(true);
      setResourcesError(null);
      try {
        const response = await fetchCommunityResources(state, city, resourceCategory);
        if (!cancelled) setResources(response);
      } catch {
        if (!cancelled) setResourcesError('Unable to load nearby resources right now.');
      } finally {
        if (!cancelled) setResourcesLoading(false);
      }
    };

    loadResources();
    return () => {
      cancelled = true;
    };
  }, [city, resourceCategory, state]);

  useEffect(() => {
    const messagesRef = collection(db, 'community_rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(60));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nextMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: String(data.text || ''),
          userName: String(data.userName || 'Neighbor'),
          userId: String(data.userId || 'anonymous'),
          createdAt: data.createdAt?.toDate?.() || null,
        };
      });
      setMessages(nextMessages);
    });

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    const text = chatDraft.trim();
    if (!text || sendingMessage) return;
    if (!auth.currentUser) {
      signIn();
      return;
    }

    setSendingMessage(true);
    try {
      await addDoc(collection(db, 'community_rooms', roomId, 'messages'), {
        text,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || userProfile?.email || 'Neighbor',
        createdAt: serverTimestamp(),
        state,
        city,
      });
      setChatDraft('');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-indigo-950">Community</h2>
          <p className="mt-2 font-bold text-slate-400">
            Live events, local conversation, and nearby help for {locationLabel}.
          </p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Community Room</p>
          <p className="mt-1 text-sm font-bold text-slate-700">{roomId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[36px] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <CalendarDays size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-indigo-950">Community Events</h3>
              <p className="text-sm font-bold text-slate-400">
                Upcoming town halls, support clinics, meetups, and neighborhood gatherings.
              </p>
            </div>
          </div>

          {eventsLoading ? (
            <div className="flex h-56 items-center justify-center gap-3 text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              <span className="font-bold">Loading events...</span>
            </div>
          ) : eventsError ? (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-600">{eventsError}</div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[28px] border border-slate-100 bg-slate-50/70 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-700">
                          {event.category || 'Community'}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{formatDateTime(event.startDate)}</span>
                      </div>
                      <h4 className="text-xl font-black text-slate-950">{event.title}</h4>
                      <p className="text-sm font-medium leading-6 text-slate-600">{event.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-500">
                        {event.venue && (
                          <span className="flex items-center gap-2">
                            <MapPin size={14} />
                            {event.venue}
                          </span>
                        )}
                        {event.organizer && (
                          <span className="flex items-center gap-2">
                            <MessageSquare size={14} />
                            {event.organizer}
                          </span>
                        )}
                      </div>
                    </div>
                    {event.url && (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-indigo-100"
                      >
                        Open
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[36px] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-indigo-950">Neighborhood Chat</h3>
              <p className="text-sm font-bold text-slate-400">
                Shared chat for neighbors in {locationLabel}. Sign in to post.
              </p>
            </div>
          </div>

          <div className="mb-4 h-[360px] space-y-3 overflow-y-auto rounded-[28px] bg-slate-50 p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm font-bold text-slate-400">
                No messages yet. Start the local conversation.
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.userId === user?.uid;
                return (
                  <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-[24px] px-4 py-3 ${isOwn ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 shadow-sm'}`}>
                      <div className={`mb-1 text-[10px] font-black uppercase tracking-[0.18em] ${isOwn ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {message.userName}
                      </div>
                      <p className="text-sm font-medium leading-6">{message.text}</p>
                      {message.createdAt && (
                        <div className={`mt-2 text-[10px] font-bold ${isOwn ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {message.createdAt.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="space-y-3">
            {!user && (
              <button
                onClick={signIn}
                className="w-full rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-700"
              >
                Sign in to join neighborhood chat
              </button>
            )}
            <div className="flex items-center gap-2 rounded-[24px] border border-slate-200 bg-white px-3 py-2">
              <input
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSendMessage()}
                placeholder="Ask for help, share an event, or coordinate with neighbors..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatDraft.trim() || sendingMessage}
                className="rounded-full bg-indigo-600 p-2 text-white disabled:opacity-40"
              >
                {sendingMessage ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[36px] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-indigo-950">Nearby Help</h3>
            <p className="text-sm font-bold text-slate-400">
              Look for translators, shelters, lawyers, and immigration support near {locationLabel}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(resourceMeta) as ResourceCategory[]).map((category) => (
              <button
                key={category}
                onClick={() => setResourceCategory(category)}
                className={`rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition-all ${
                  resourceCategory === category
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-600 hover:text-indigo-600'
                }`}
              >
                {resourceMeta[category].label}
              </button>
            ))}
          </div>
        </div>

        {resourcesLoading ? (
          <div className="flex h-52 items-center justify-center gap-3 text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="font-bold">Loading nearby resources...</span>
          </div>
        ) : resourcesError ? (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-600">{resourcesError}</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {resources.map((resource) => (
              <div key={resource.id} className="rounded-[28px] border border-slate-100 bg-slate-50/70 p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${resourceMeta[resource.category].accent}`}>
                      {resourceMeta[resource.category].icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-950">{resource.name}</h4>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        {resourceMeta[resource.category].label}
                      </p>
                    </div>
                  </div>
                  {resource.website && (
                    <a href={resource.website} target="_blank" rel="noreferrer" className="text-indigo-600">
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
                <p className="text-sm font-medium leading-6 text-slate-600">{resource.description}</p>
                <div className="mt-4 space-y-2 text-sm font-bold text-slate-500">
                  {resource.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 shrink-0" />
                      <span>{resource.address}</span>
                    </div>
                  )}
                  {resource.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} />
                      <a href={`tel:${resource.phone}`} className="hover:text-indigo-600">{resource.phone}</a>
                    </div>
                  )}
                  {resource.hours && (
                    <div className="flex items-center gap-2">
                      <Clock3 size={14} />
                      <span>{resource.hours}</span>
                    </div>
                  )}
                  {resource.languages && resource.languages.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Languages size={14} className="mt-0.5 shrink-0" />
                      <span>{resource.languages.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CommunityView;
