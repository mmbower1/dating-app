import mongoose, { Document, Schema } from 'mongoose';

interface IMatchUser {
  userId: mongoose.Types.ObjectId;
  model: 'MaleUser' | 'FemaleUser' | 'OtherUser';
  name: string;
  photo: string;
}

export interface IMatch extends Document {
  users: IMatchUser[];
  active: boolean;
  lastMessageAt: Date | null;
  slowResponsePenalties: number;
  conversationEndedAt: Date | null;
  endedBy: mongoose.Types.ObjectId | null;
  endReason: 'graceful_exit' | 'ghosted' | 'mutual' | 'expired' | null;
  ghostedUserId: mongoose.Types.ObjectId | null;
  exitRating: 'genuine' | 'not_genuine' | null;
  exitRatedBy: mongoose.Types.ObjectId | null;
  celebrationSeenBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
    users: {
      type: [
        {
          userId: { type: Schema.Types.ObjectId, refPath: 'users.model', required: true },
          model: { type: String, enum: ['MaleUser', 'FemaleUser', 'OtherUser'], required: true },
          name: { type: String, required: true },
          photo: { type: String, default: '' },
        },
      ],
      validate: (v: unknown[]) => v.length === 2,
      required: true,
    },
    active: { type: Boolean, default: true },
    lastMessageAt: { type: Date, default: null },
    slowResponsePenalties: { type: Number, default: 0 },
    conversationEndedAt: { type: Date, default: null },
    endedBy: { type: Schema.Types.ObjectId, default: null },
    endReason: {
      type: String,
      enum: ['graceful_exit', 'ghosted', 'mutual', 'expired', null],
      default: null,
    },
    ghostedUserId: { type: Schema.Types.ObjectId, default: null },
    exitRating: { type: String, enum: ['genuine', 'not_genuine', null], default: null },
    exitRatedBy: { type: Schema.Types.ObjectId, default: null },
    celebrationSeenBy: [{ type: Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

export default mongoose.model<IMatch>('Match', MatchSchema);
