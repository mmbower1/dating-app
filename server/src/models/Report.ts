import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  reporterGender: string;
  reportedId: mongoose.Types.ObjectId;
  reportedGender: string;
  category: 'inappropriate_photos' | 'harassment' | 'fake_profile' | 'spam' | 'underage' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, required: true },
    reporterGender: { type: String, required: true },
    reportedId: { type: Schema.Types.ObjectId, required: true },
    reportedGender: { type: String, required: true },
    category: {
      type: String,
      enum: ['inappropriate_photos', 'harassment', 'fake_profile', 'spam', 'underage', 'other'],
      required: true,
    },
    description: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.model<IReport>('Report', ReportSchema);
