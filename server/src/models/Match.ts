import mongoose, { Document, Schema } from 'mongoose';

export interface IMatch extends Document {
  users: [mongoose.Types.ObjectId, mongoose.Types.ObjectId];
  active: boolean;
  // Conversation health tracking
  lastMessageAt: Date | null;
  conversationEndedAt: Date | null;
  endedBy: mongoose.Types.ObjectId | null;
  endReason: 'graceful_exit' | 'ghosted' | 'mutual' | null;
  ghostedUserId: mongoose.Types.ObjectId | null;  // who got ghosted
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
    users: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }] as unknown as [
        typeof Schema.Types.ObjectId,
        typeof Schema.Types.ObjectId
      ],
      validate: (v: unknown[]) => v.length === 2,
      required: true,
    },
    active: { type: Boolean, default: true },
    lastMessageAt: { type: Date, default: null },
    conversationEndedAt: { type: Date, default: null },
    endedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    endReason: {
      type: String,
      enum: ['graceful_exit', 'ghosted', 'mutual', null],
      default: null,
    },
    ghostedUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IMatch>('Match', MatchSchema);
