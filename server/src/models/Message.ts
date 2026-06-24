import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  matchId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text: string;
  read: boolean;
  type: 'text' | 'graceful_exit';
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 1000 },
    read: { type: Boolean, default: false },
    type: { type: String, enum: ['text', 'graceful_exit'], default: 'text' },
  },
  { timestamps: true }
);

MessageSchema.index({ matchId: 1, createdAt: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
