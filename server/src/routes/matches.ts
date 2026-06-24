import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Match from '../models/Match';
import mongoose from 'mongoose';

const router = Router();

// Like a user — creates a match if mutual
router.post('/like/:targetId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = await User.findById(req.userId);
    const target = await User.findById(req.params.targetId);
    if (!me || !target) { res.status(404).json({ message: 'User not found' }); return; }

    me.likedUsers.push(target._id as mongoose.Types.ObjectId);
    await me.save();

    const mutualLike = target.likedUsers.some((id) => id.equals(me._id as mongoose.Types.ObjectId));
    if (mutualLike) {
      const match = await Match.create({ users: [me._id, target._id] });
      res.json({ matched: true, matchId: match._id });
    } else {
      res.json({ matched: false });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Pass on a user
router.post('/pass/:targetId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = await User.findById(req.userId);
    if (!me) { res.status(404).json({ message: 'User not found' }); return; }

    me.passedUsers.push(new mongoose.Types.ObjectId(req.params.targetId as string));
    await me.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Get all my matches
router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matches = await Match.find({ users: req.userId, active: true })
      .populate('users', 'name photos accountabilityScore bio age')
      .sort({ updatedAt: -1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Graceful exit — politely close a match
router.patch('/:matchId/exit', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const match = await Match.findOne({ _id: req.params.matchId, users: req.userId });
    if (!match) { res.status(404).json({ message: 'Match not found' }); return; }

    match.active = false;
    match.conversationEndedAt = new Date();
    match.endedBy = new mongoose.Types.ObjectId(req.userId as string);
    match.endReason = 'graceful_exit';
    await match.save();

    // Reward sender: increment gracefulExitCount, recalculate score
    await User.findByIdAndUpdate(req.userId, {
      $inc: { gracefulExitCount: 1 },
    });
    await recalculateScore(req.userId!);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Internal: recalculate accountability score
async function recalculateScore(userId: string) {
  const user = await User.findById(userId);
  if (!user) return;

  const ghostPenalty = Math.min(user.ghostCount * 5, 40);
  const exitBonus = Math.min(user.gracefulExitCount * 3, 20);
  const responseBonus = (user.responseRate / 100) * 30;

  const score = Math.max(0, Math.min(100, 50 + exitBonus + responseBonus - ghostPenalty));
  user.accountabilityScore = Math.round(score);
  await user.save();
}

export { recalculateScore };
export default router;
