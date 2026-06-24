export interface User {
  _id: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  interestedIn: string[];
  bio: string;
  photos: string[];
  location?: { city: string; state: string };
  accountabilityScore: number;
  responseRate: number;
  ghostCount: number;
  gracefulExitCount: number;
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
  endReason: 'graceful_exit' | 'ghosted' | 'mutual' | null;
  createdAt: string;
}

export interface Message {
  _id: string;
  matchId: string;
  senderId: string;
  text: string;
  read: boolean;
  type: 'text' | 'graceful_exit';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
