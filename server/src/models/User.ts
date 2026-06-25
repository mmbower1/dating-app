import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  age: number;
  gender: 'male' | 'female' | 'non-binary' | 'other';
  interestedIn: ('male' | 'female' | 'non-binary' | 'other')[];
  phone: string;
  bio: string;
  photos: string[];
  location: { city: string; state: string; lat?: number | null; lng?: number | null };
  // Profile attributes (about the user themselves)
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
  totalConversations: number;
  agePreference: { min: number; max: number };
  // Discover filter preferences
  filters?: {
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
  };
  isAdmin: boolean;
  pushSubscription: Record<string, unknown> | null;
  likedUsers: mongoose.Types.ObjectId[];
  passedUsers: mongoose.Types.ObjectId[];
  blockedUsers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    age: { type: Number, required: true, min: 18 },
    gender: { type: String, enum: ['male', 'female', 'non-binary', 'other'], required: true },
    interestedIn: [{ type: String, enum: ['male', 'female', 'non-binary', 'other'] }],
    phone: { type: String, default: '' },
    bio: { type: String, maxlength: 500, default: '' },
    photos: [{ type: String }],
    location: {
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    ethnicity: { type: String, default: '' },
    religion: { type: String, default: '' },
    height: { type: Number, default: null },
    hasChildren: { type: Boolean, default: null },
    drinks: { type: String, default: '' },
    smokes: { type: String, default: '' },
    pronouns: { type: String, default: '' },
    sexuality: { type: String, default: '' },
    politicalAssociation: { type: String, default: '' },
    educationLevel: { type: String, default: '' },
    zodiacSign: { type: String, default: '' },
    pets: { type: String, default: '' },
    familyPlans: { type: String, default: '' },
    work: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    school: { type: String, default: '' },
    hometown: { type: String, default: '' },
    languages: { type: String, default: '' },
    accountabilityScore: { type: Number, default: 75, min: 0, max: 100 },
    responseRate: { type: Number, default: 100, min: 0, max: 100 },
    ghostCount: { type: Number, default: 0 },
    gracefulExitCount: { type: Number, default: 0 },
    totalConversations: { type: Number, default: 0 },
    agePreference: {
      min: { type: Number, default: 18 },
      max: { type: Number, default: 99 },
    },
    filters: {
      ethnicities: [{ type: String }],
      religions: [{ type: String }],
      heightMin: { type: Number, default: null },
      heightMax: { type: Number, default: null },
      hasChildren: { type: String, enum: ['yes', 'no', 'any'], default: 'any' },
      drinks: [{ type: String }],
      smokes: [{ type: String }],
      politicalAssociations: [{ type: String }],
      educationLevels: [{ type: String }],
      maxDistance: { type: Number, default: null },
    },
    isAdmin: { type: Boolean, default: false },
    pushSubscription: { type: Schema.Types.Mixed, default: null },
    likedUsers: [{ type: Schema.Types.ObjectId }],
    passedUsers: [{ type: Schema.Types.ObjectId }],
    blockedUsers: [{ type: Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

export const MaleUser = mongoose.model<IUser>('MaleUser', UserSchema, 'males');
export const FemaleUser = mongoose.model<IUser>('FemaleUser', UserSchema, 'females');
export const OtherUser = mongoose.model<IUser>('OtherUser', UserSchema, 'others');

export type GenderModel = typeof MaleUser;

export function getUserModel(gender: string): GenderModel {
  if (gender === 'male') return MaleUser;
  if (gender === 'female') return FemaleUser;
  return OtherUser;
}

export function getModelName(gender: string): 'MaleUser' | 'FemaleUser' | 'OtherUser' {
  if (gender === 'male') return 'MaleUser';
  if (gender === 'female') return 'FemaleUser';
  return 'OtherUser';
}

export async function findUserById(id: string): Promise<IUser | null> {
  return (
    (await MaleUser.findById(id)) ??
    (await FemaleUser.findById(id)) ??
    (await OtherUser.findById(id))
  );
}
