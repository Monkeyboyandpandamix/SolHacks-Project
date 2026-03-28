export interface UserProfile {
  uid: string;
  email: string;
  situation?: string;
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
  status?: 'published' | 'flagged';
  moderationNote?: string;
}

export interface Poll {
  question: string;
  options: { label: string; count: number }[];
  userChoice?: string;
}

export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface ConflictAnalysis {
  summary: string;
  risk: 'low' | 'medium' | 'high';
  overlaps: string[];
}

export interface HearingEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  type: 'hearing' | 'town-hall' | 'committee';
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
  author: string;
  text: string;
  date: string;
  verified: boolean;
}

export interface BookmarkCollection {
  id: string;
  name: string;
  lawIds: string[];
}

export interface RepresentativeChannel {
  type: string;
  id: string;
}

export interface RepresentativeVoteRecord {
  billTitle: string;
  stance: 'support' | 'oppose' | 'watching';
  note: string;
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
  glossary?: GlossaryItem[];
  personalImpact?: string;
  lastUpdated?: string;
  conflictAnalysis?: ConflictAnalysis;
  hearings?: HearingEvent[];
  advocacyGroups?: AdvocacyGroup[];
  impactStories?: ImpactStory[];
  relatedLawIds?: string[];
  velocityScore?: number;
}

export interface Representative {
  id: string;
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
  channels?: RepresentativeChannel[];
  sponsoredBills?: string[];
  votingRecord?: RepresentativeVoteRecord[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'new' | 'update' | 'status_change' | 'alert' | 'moderation';
  lawId?: string;
}

export interface UserSettings {
  highContrast: boolean;
  largeFont: boolean;
  language: string;
  location: {
    state: string;
    city: string;
  };
  interests: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
