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
  // Accountability system
  accountabilityScore: number;    // 0-100, affects match visibility
  responseRate: number;           // percentage of messages replied to
  ghostCount: number;             // times user went silent mid-conversation
  gracefulExitCount: number;      // times user sent a polite "not interested"
  totalConversations: number;
  // Swipe state
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
    likedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    passedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
