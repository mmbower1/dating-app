import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import User from '../models/User';

const router = Router();

// Get potential matches (excludes already liked/passed/blocked users)
router.get('/discover', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = await User.findById(req.userId);
    if (!me) { res.status(404).json({ message: 'User not found' }); return; }

    const excluded = [me._id, ...me.likedUsers, ...me.passedUsers, ...me.blockedUsers];

    const candidates = await User.find({
      _id: { $nin: excluded },
      gender: { $in: me.interestedIn },
      interestedIn: me.gender,
    })
      .select('-password -likedUsers -passedUsers -blockedUsers')
      .limit(20);

    res.json(candidates);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Update own profile
router.patch('/me', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allowed = ['name', 'bio', 'photos', 'location', 'age'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

export default router;
