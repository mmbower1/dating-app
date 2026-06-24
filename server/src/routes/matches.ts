import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { getUserModel, getModelName, findUserById } from '../models/User';
import Match from '../models/Match';
import mongoose from 'mongoose';
import { sendPush } from '../utils/push';
import type webpush from 'web-push';

const router = Router();

// Like a user — creates a match if mutual
router.post('/like/:targetId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const UserModel = getUserModel(req.userGender!);
    const me = await UserModel.findById(req.userId);
    const target = await findUserById(req.params.targetId as string);
    if (!me || !target) { res.status(404).json({ message: 'User not found' }); return; }

    me.likedUsers.push(target._id as mongoose.Types.ObjectId);
    await me.save();

    const mutualLike = target.likedUsers.some((id) => id.equals(me._id as mongoose.Types.ObjectId));
    if (mutualLike) {
      const match = await Match.create({
        users: [
          { userId: me._id, model: getModelName(me.gender), name: me.name, photo: me.photos[0] ?? '' },
          { userId: target._id, model: getModelName(target.gender), name: target.name, photo: target.photos[0] ?? '' },
        ],
      });

      // Notify both users
      if (target.pushSubscription) {
        sendPush(target.pushSubscription as unknown as webpush.PushSubscription, "It's a match! 💜", `You matched with ${me.name}`);
      }
      if (me.pushSubscription) {
        sendPush(me.pushSubscription as unknown as webpush.PushSubscription, "It's a match! 💜", `You matched with ${target.name}`);
      }

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
    const UserModel = getUserModel(req.userGender!);
    const me = await UserModel.findById(req.userId);
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
    const matches = await Match.find({ 'users.userId': req.userId, active: true })
      .populate({ path: 'users.userId', select: 'name photos accountabilityScore bio age gender' })
      .sort({ updatedAt: -1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Graceful exit — politely close a match
router.patch('/:matchId/exit', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const match = await Match.findOne({ _id: req.params.matchId, 'users.userId': req.userId });
    if (!match) { res.status(404).json({ message: 'Match not found' }); return; }

    match.active = false;
    match.conversationEndedAt = new Date();
    match.endedBy = new mongoose.Types.ObjectId(req.userId as string);
    match.endReason = 'graceful_exit';
    await match.save();

    const UserModel = getUserModel(req.userGender!);
    await UserModel.findByIdAndUpdate(req.userId, { $inc: { gracefulExitCount: 1 } });
    await recalculateScore(req.userId!, req.userGender!);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

async function recalculateScore(userId: string, gender: string) {
  const UserModel = getUserModel(gender);
  const user = await UserModel.findById(userId);
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
