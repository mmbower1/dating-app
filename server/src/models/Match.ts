import mongoose, { Document, Schema } from 'mongoose';

interface IMatchUser {
  userId: mongoose.Types.ObjectId;
  model: 'MaleUser' | 'FemaleUser' | 'OtherUser';
}

export interface IMatch extends Document {
  users: IMatchUser[];
  active: boolean;
  lastMessageAt: Date | null;
  conversationEndedAt: Date | null;
  endedBy: mongoose.Types.ObjectId | null;
  endReason: 'graceful_exit' | 'ghosted' | 'mutual' | null;
  ghostedUserId: mongoose.Types.ObjectId | null;
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
        },
      ],
      validate: (v: unknown[]) => v.length === 2,
      required: true,
    },
    active: { type: Boolean, default: true },
    lastMessageAt: { type: Date, default: null },
    conversationEndedAt: { type: Date, default: null },
    endedBy: { type: Schema.Types.ObjectId, default: null },
    endReason: {
      type: String,
      enum: ['graceful_exit', 'ghosted', 'mutual', null],
      default: null,
    },
    ghostedUserId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IMatch>('Match', MatchSchema);
