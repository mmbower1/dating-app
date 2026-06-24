import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  age: number;
  gender: 'male' | 'female' | 'non-binary' | 'other';
  interestedIn: ('male' | 'female' | 'non-binary' | 'other')[];
  bio: string;
  photos: string[];
  location: {
    city: string;
    state: string;
  };
  accountabilityScore: number;
  responseRate: number;
  ghostCount: number;
  gracefulExitCount: number;
  totalConversations: number;
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
    bio: { type: String, maxlength: 500, default: '' },
    photos: [{ type: String }],
    location: {
      city: { type: String, default: '' },
      state: { type: String, default: '' },
    },
    accountabilityScore: { type: Number, default: 75, min: 0, max: 100 },
    responseRate: { type: Number, default: 100, min: 0, max: 100 },
    ghostCount: { type: Number, default: 0 },
    gracefulExitCount: { type: Number, default: 0 },
    totalConversations: { type: Number, default: 0 },
    likedUsers: [{ type: Schema.Types.ObjectId }],
    passedUsers: [{ type: Schema.Types.ObjectId }],
    blockedUsers: [{ type: Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

// Three collections: males, females, others (covers non-binary + other)
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

// Search all collections when we only have an ID (e.g. cross-collection lookups)
export async function findUserById(id: string): Promise<IUser | null> {
  return (
    (await MaleUser.findById(id)) ??
    (await FemaleUser.findById(id)) ??
    (await OtherUser.findById(id))
  );
}
