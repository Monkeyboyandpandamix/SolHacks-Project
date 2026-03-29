export interface UserProfile {
  uid: string;
  email: string;
  situation?: string; // e.g., "I'm an international student working part-time"
  location: {
    state: string;
    city: string;
    zipCode?: string;
  };
  interests: string[];
  followedTopics: string[];
  lastUpdated: string;
}

export interface LawTimeline {
  stage: 'introduced' | 'committee' | 'voting' | 'passed' | 'law' | 'rejected';
  date: string;
  description: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  date: string;
}

export interface Poll {
  question: string;
  options: { label: string; count: number }[];
  userChoice?: string;
}

export interface HearingEvent {
  id: string;
  title: string;
  date: string;
  venue?: string;
  type: 'hearing' | 'meeting' | 'deadline';
  registrationUrl?: string;
}

export interface AdvocacyGroup {
  id: string;
  name: string;
  mission: string;
  website?: string;
}

export interface ImpactStory {
  id: string;
  text: string;
  createdAt?: string;
  authorName?: string;
}

export interface RepresentativeVoteRecord {
  billTitle: string;
  stance: 'support' | 'oppose' | 'watching';
  note: string;
}

export interface ConflictAnalysis {
  risk: 'low' | 'medium' | 'high';
  overlaps: string[];
  summary: string;
}

export interface BookmarkCollection {
  id: string;
  name: string;
  description?: string;
  lawIds: string[];
  createdAt?: string;
}

export interface Law {
  id: string;
  title: string;
  originalText: string;
  simplifiedSummary: string;
  impact: string;
  category: string;
  level: 'federal' | 'state' | 'county' | 'city';
  status: 'proposed' | 'passed' | 'rejected' | 'updated';
  location: {
    state: string;
    city?: string;
  };
  date: string;
  votes?: {
    support: number;
    oppose: number;
  };
  userVote?: 'support' | 'oppose';
  saved?: boolean;
  comments?: Comment[];
  poll?: Poll;
  sourceUrl?: string;
  timeline?: LawTimeline[];
  glossary?: { term: string; definition: string }[];
  personalImpact?: string;
  lastUpdated?: string; // For caching logic
  relatedLawIds?: string[];
  velocityScore?: number;
  hearings?: HearingEvent[];
  advocacyGroups?: AdvocacyGroup[];
  impactStories?: ImpactStory[];
}

export interface Representative {
  id: string;
  /** Library of Congress Bioguide ID when resolved via Congress.gov (enables richer voting/activity data). */
  bioguideId?: string;
  name: string;
  role?: string;
  office?: string;
  party: string;
  photoUrl?: string;
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
    twitter?: string;
  };
  emails?: string[];
  phones?: string[];
  urls?: string[];
  channels?: { type: string; id: string }[];
  sponsoredBills: string[]; // IDs of bills
  votingRecord?: RepresentativeVoteRecord[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'new' | 'update' | 'status_change';
  lawId?: string;
}

export interface UserSettings {
  highContrast: boolean;
  fontSize: 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
  underlineLinks?: boolean;
  language: string;
  location: {
    state: string;
    city: string;
    /** U.S. ZIP (5 or ZIP+4) — used for House district / representatives lookup */
    zipCode?: string;
  };
  interests: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  startDate: string;
  venue?: string;
  organizer?: string;
  description: string;
  url?: string;
  category?: string;
}

export interface CommunityResource {
  id: string;
  name: string;
  category: 'translator' | 'shelter' | 'legal' | 'immigration';
  description: string;
  address?: string;
  phone?: string;
  website?: string;
  languages?: string[];
  hours?: string;
}
