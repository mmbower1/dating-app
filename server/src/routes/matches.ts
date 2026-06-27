import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { getUserModel, getModelName, findUserById } from '../models/User';
import Match from '../models/Match';
import Message from '../models/Message';
import mongoose from 'mongoose';
import { sendPush } from '../utils/push';
import type webpush from 'web-push';

const router = Router();

// Like a user — creates a match if mutual. Optional comment becomes first message.
router.post('/like/:targetId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activeMatch = await Match.findOne({ 'users.userId': req.userId, active: true });
    if (activeMatch) { res.status(403).json({ message: 'Swiping is locked while you have an active match.' }); return; }

    const UserModel = getUserModel(req.userGender!);
    const me = await UserModel.findById(req.userId);
    const target = await findUserById(req.params.targetId as string);
    if (!me || !target) { res.status(404).json({ message: 'User not found' }); return; }

    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
    const section = typeof req.body.section === 'string' ? req.body.section.trim() : '';

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

      const { io } = await import('../index');
      const matchRoomId = (match._id as mongoose.Types.ObjectId).toString();

      // Always post a 'like' context message so both parties see what sparked the match
      const likeText = section
        ? `${me.name} liked your ${section}${comment ? `\n\n"${comment}"` : ''}`
        : comment || '';
      if (likeText) {
        const likeMsg = await Message.create({
          matchId: match._id,
          senderId: new mongoose.Types.ObjectId(req.userId as string),
          text: likeText,
          type: section ? 'like' : 'text',
        });
        io.to(matchRoomId).emit('new_message', likeMsg);
      }

      const pushBody = comment
        ? `${me.name} said: "${comment}"`
        : section
          ? `${me.name} liked your ${section}`
          : `You matched with ${me.name}`;

      if (target.pushSubscription) {
        sendPush(target.pushSubscription as unknown as webpush.PushSubscription, "It's a match! 💜", pushBody);
      }
      if (me.pushSubscription) {
        sendPush(me.pushSubscription as unknown as webpush.PushSubscription, "It's a match! 💜", `You matched with ${target.name}`);
      }

      res.json({ matched: true, matchId: match._id });
    } else {
      // Not a match yet — push-notify the target with context
      if (target.pushSubscription) {
        const pushBody = comment
          ? `"${comment}"`
          : section
            ? `Liked your ${section}`
            : 'Check out their profile';
        sendPush(
          target.pushSubscription as unknown as webpush.PushSubscription,
          `${me.name} liked your profile 💜`,
          pushBody
        );
      }
      res.json({ matched: false });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Pass on a user
router.post('/pass/:targetId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activeMatch = await Match.findOne({ 'users.userId': req.userId, active: true });
    if (activeMatch) { res.status(403).json({ message: 'Swiping is locked while you have an active match.' }); return; }

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

// Undo a pass — remove target from passedUsers
router.delete('/pass/:targetId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const UserModel = getUserModel(req.userGender!);
    await UserModel.findByIdAndUpdate(req.userId, {
      $pull: { passedUsers: new mongoose.Types.ObjectId(req.params.targetId as string) },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Unread badge count — used by the nav tab
router.get('/unread-count', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matches = await Match.find({ 'users.userId': req.userId, active: true });
    if (!matches.length) { res.json({ count: 0, matchId: null }); return; }

    const match = matches[0];
    const count = await Message.countDocuments({
      matchId: match._id,
      senderId: { $ne: new mongoose.Types.ObjectId(req.userId as string) },
      read: false,
    });

    res.json({ count, matchId: (match._id as mongoose.Types.ObjectId).toString() });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Mark all messages in a match as read (called when opening chat or matches tab)
router.post('/:matchId/mark-read', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Message.updateMany(
      {
        matchId: req.params.matchId,
        senderId: { $ne: new mongoose.Types.ObjectId(req.userId as string) },
        read: false,
      },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Get all my matches — expire any stale ones first (no message in 72 hrs)
router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const expiryMs = 72 * 60 * 60 * 1000;
    const expiryThreshold = new Date(Date.now() - expiryMs);
    await Match.updateMany(
      { 'users.userId': req.userId, active: true, lastMessageAt: null, createdAt: { $lt: expiryThreshold } },
      { $set: { active: false, endReason: 'expired', conversationEndedAt: new Date() } }
    );

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

    // Post a system message visible to both parties, including their reason
    const me = await UserModel.findById(req.userId);
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    const systemText = reason
      ? `${me?.name ?? 'Your match'} unmatched and left this note: "${reason}"`
      : `${me?.name ?? 'Your match'} chose not to continue this conversation.`;
    const systemMsg = await Message.create({
      matchId: match._id,
      senderId: new mongoose.Types.ObjectId(req.userId as string),
      text: systemText,
      type: 'graceful_exit',
    });

    // Push the system message in real-time so the other person sees it without refreshing
    const { io } = await import('../index');
    io.to((match._id as mongoose.Types.ObjectId).toString()).emit('new_message', systemMsg);

    // Remove each other from likedUsers so they can appear in discover again
    const [userA, userB] = match.users;
    const modelToGender = (m: string) => m === 'MaleUser' ? 'male' : m === 'FemaleUser' ? 'female' : 'other';
    const ModelA = getUserModel(modelToGender(userA.model));
    const ModelB = getUserModel(modelToGender(userB.model));
    await Promise.all([
      ModelA.findByIdAndUpdate(userA.userId, { $pull: { likedUsers: userB.userId } }),
      ModelB.findByIdAndUpdate(userB.userId, { $pull: { likedUsers: userA.userId } }),
    ]);

    // Push-notify the other person
    const otherEntry = match.users.find((u) => u.userId.toString() !== req.userId);
    if (otherEntry) {
      const other = await findUserById(otherEntry.userId.toString());
      if (other?.pushSubscription) {
        sendPush(
          other.pushSubscription as unknown as webpush.PushSubscription,
          'Connection closed',
          `${me?.name ?? 'Your match'} has ended this conversation. You're free to connect again.`
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

async function recalculateScore(userId: string, gender: string) {
  const UserModel = getUserModel(gender);
  const user = await UserModel.findById(userId);
  if (!user) return;

  // Start at 100, deduct for bad behaviour
  const ghostPenalty = Math.min(user.ghostCount * 10, 50);
  const responsePenalty = Math.round((1 - user.responseRate / 100) * 30);

  const score = Math.max(0, Math.min(100, 100 - ghostPenalty - responsePenalty));
  user.accountabilityScore = Math.round(score);
  await user.save();
}

export { recalculateScore };
export default router;
