export interface DiscoverFilters {
  ethnicities: string[];
  religions: string[];
  heightMin: number | null;
  heightMax: number | null;
  hasChildren: 'yes' | 'no' | 'any';
  drinks: string[];
  smokes: string[];
  politicalAssociations: string[];
  educationLevels: string[];
  maxDistance: number | null;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  interestedIn: string[];
  bio: string;
  photos: string[];
  location?: { city: string; state: string; lat?: number | null; lng?: number | null };
  pronouns?: string;
  sexuality?: string;
  ethnicity?: string;
  religion?: string;
  height?: number | null;
  hasChildren?: boolean | null;
  familyPlans?: string;
  drinks?: string;
  smokes?: string;
  politicalAssociation?: string;
  educationLevel?: string;
  zodiacSign?: string;
  pets?: string;
  work?: string;
  jobTitle?: string;
  school?: string;
  hometown?: string;
  languages?: string;
  accountabilityScore: number;
  responseRate: number;
  ghostCount: number;
  gracefulExitCount: number;
  agePreference?: { min: number; max: number };
  filters?: DiscoverFilters;
  isAdmin?: boolean;
}

export interface MatchUser {
  userId: User;
  model: 'MaleUser' | 'FemaleUser' | 'OtherUser';
}

export interface Match {
  _id: string;
  users: MatchUser[];
  active: boolean;
  lastMessageAt: string | null;
  endReason: 'graceful_exit' | 'ghosted' | 'mutual' | 'expired' | null;
  createdAt: string;
}

export interface Message {
  _id: string;
  matchId: string;
  senderId: string;
  text: string;
  read: boolean;
  type: 'text' | 'graceful_exit' | 'like';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
