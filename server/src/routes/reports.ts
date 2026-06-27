import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { protect, AuthRequest } from '../middleware/auth';
import Report, { IReport } from '../models/Report';
import { findUserById, getUserModel } from '../models/User';

const router = Router();

// POST /reports — create a new report
router.post('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reportedUserId, reportedGender, category, description } = req.body as {
      reportedUserId: string;
      reportedGender: string;
      category: IReport['category'];
      description?: string;
    };

    if (!reportedUserId || !reportedGender || !category) {
      res.status(400).json({ message: 'reportedUserId, reportedGender, and category are required' });
      return;
    }

    const report = await Report.create({
      reporterId: new mongoose.Types.ObjectId(req.userId!),
      reporterGender: req.userGender!,
      reportedId: new mongoose.Types.ObjectId(reportedUserId),
      reportedGender,
      category,
      description: description ?? '',
    });

    // If the reported user now has 3+ pending reports, flag them for review
    const pendingCount = await Report.countDocuments({
      reportedId: new mongoose.Types.ObjectId(reportedUserId),
      status: 'pending',
    });
    if (pendingCount >= 3) {
      const reportedUser = await findUserById(reportedUserId);
      if (reportedUser) {
        await getUserModel(reportedUser.gender).findByIdAndUpdate(reportedUserId, {
          $set: { flaggedForReview: true },
        });
      }
    }

    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

export default router;
