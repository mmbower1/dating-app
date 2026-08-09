import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { getUserModel, getModelName, findUserById, MaleUser, FemaleUser, OtherUser } from '../models/User';
import Match from '../models/Match';
import Message from '../models/Message';
import mongoose from 'mongoose';
import { sendPush } from '../utils/push';
import type webpush from 'web-push';
import { emitToUser } from '../index';
import { calcScore, unmatchPenalty } from '../utils/scoreCalc';

const router = Router();

// Like a user — creates a match if mutual. Optional comment becomes first message.
router.post('/like/:targetId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await expireStaleMatches(req.userId!);
    const activeMatchCount = await Match.countDocuments({ 'users.userId': req.userId, active: true });
    if (activeMatchCount >= 2) { res.status(403).json({ message: 'Swiping is locked while you have 2 active matches.' }); return; }

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
      // Mark the current user (me, second liker) as having seen the celebration already
      const match = await Match.create({
        users: [
          { userId: me._id, model: getModelName(me.gender), name: me.name, photo: me.photos[0] ?? '' },
          { userId: target._id, model: getModelName(target.gender), name: target.name, photo: target.photos[0] ?? '' },
        ],
        celebrationSeenBy: [new mongoose.Types.ObjectId(req.userId as string)],
      });

      const { io } = await import('../index');
      const matchRoomId = (match._id as mongoose.Types.ObjectId).toString();

      // Notify the first liker (target) that their like became a match
      emitToUser(target._id.toString(), 'new_match', {
        matchId: (match._id as mongoose.Types.ObjectId).toString(),
        matchedUser: { _id: me._id, name: me.name, photos: me.photos },
      });

      // Post opening move if either user has one (second liker's takes priority)
      const omText = me.openingMove?.trim() || target.openingMove?.trim() || '';
      const omSender = me.openingMove?.trim()
        ? new mongoose.Types.ObjectId(req.userId as string)
        : (target._id as mongoose.Types.ObjectId);
      if (omText) {
        const omMsg = await Message.create({
          matchId: match._id,
          senderId: omSender,
          text: omText,
          type: 'opening_move',
        });
        io.to(matchRoomId).emit('new_message', omMsg);
      }

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
        const r = await sendPush(target.pushSubscription as unknown as webpush.PushSubscription, "It's a match! 💜", pushBody);
        if (r === 'expired') await getUserModel(target.gender).findByIdAndUpdate(target._id, { $set: { pushSubscription: null } });
      }
      if (me.pushSubscription) {
        const r = await sendPush(me.pushSubscription as unknown as webpush.PushSubscription, "It's a match! 💜", `You matched with ${target.name}`);
        if (r === 'expired') await UserModel.findByIdAndUpdate(req.userId, { $set: { pushSubscription: null } });
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
        const r = await sendPush(
          target.pushSubscription as unknown as webpush.PushSubscription,
          `${me.name} liked your profile 💜`,
          pushBody
        );
        if (r === 'expired') await getUserModel(target.gender).findByIdAndUpdate(target._id, { $set: { pushSubscription: null } });
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
    await expireStaleMatches(req.userId!);
    const activeMatchCount = await Match.countDocuments({ 'users.userId': req.userId, active: true });
    if (activeMatchCount >= 2) { res.status(403).json({ message: 'Swiping is locked while you have 2 active matches.' }); return; }

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

// Check for a match celebration the current user hasn't seen yet
router.get('/pending-celebration', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const match = await Match.findOne({
      'users.userId': req.userId,
      active: true,
      celebrationSeenBy: { $not: { $elemMatch: { $eq: new mongoose.Types.ObjectId(req.userId as string) } } },
    });
    if (!match) { res.json(null); return; }

    const otherEntry = match.users.find((u) => u.userId.toString() !== req.userId);
    if (!otherEntry) { res.json(null); return; }

    const otherUser = await findUserById(otherEntry.userId.toString());
    res.json({
      matchId: match._id,
      matchedUser: { _id: otherUser?._id, name: otherUser?.name, photos: otherUser?.photos ?? [] },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Mark the celebration as seen for the current user
router.patch('/:matchId/celebration-seen', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Match.findByIdAndUpdate(req.params.matchId, {
      $addToSet: { celebrationSeenBy: new mongoose.Types.ObjectId(req.userId as string) },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Who liked me — returns at most 1 user who liked me but I haven't responded to yet
router.get('/liked-me', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = await findUserById(req.userId!);
    if (!me) { res.status(404).json({ message: 'User not found' }); return; }

    const exclude = new Set([
      ...me.likedUsers.map((id) => id.toString()),
      ...me.passedUsers.map((id) => id.toString()),
      ...me.blockedUsers.map((id) => id.toString()),
      req.userId!,
    ]);

    const fields = 'name age photos bio accountabilityScore gender pronouns zodiacSign height location';
    const [males, females, others] = await Promise.all([
      MaleUser.find({ likedUsers: me._id, _id: { $nin: [...exclude] } }).select(fields).limit(2),
      FemaleUser.find({ likedUsers: me._id, _id: { $nin: [...exclude] } }).select(fields).limit(2),
      OtherUser.find({ likedUsers: me._id, _id: { $nin: [...exclude] } }).select(fields).limit(2),
    ]);

    const result = [...males, ...females, ...others].slice(0, 1);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Get all my matches — expire any stale ones first (no message in 72 hrs)
router.get('/ended', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matches = await Match.find({ 'users.userId': req.userId, active: false })
      .populate({ path: 'users.userId', select: 'name photos gender' })
      .sort({ updatedAt: -1 });

    const result = matches.map((m) => {
      const other = m.users.find((u) => u.userId._id?.toString() !== req.userId);
      if (!other) return null;
      const u = other.userId as unknown as { _id: string; name: string; photos: string[]; gender: string };
      return { matchId: m._id, userId: u._id, name: u.name, photos: u.photos, gender: u.gender };
    }).filter(Boolean);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

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

    const withUnread = await Promise.all(
      matches.map(async (m) => {
        const unreadCount = await Message.countDocuments({
          matchId: m._id,
          senderId: { $ne: new mongoose.Types.ObjectId(req.userId as string) },
          read: false,
        });
        return { ...m.toObject(), unreadCount };
      })
    );

    res.json(withUnread);
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

    // Check if the unmatcher ever sent a message in this conversation
    const sentAMessage = await Message.exists({
      matchId: match._id,
      senderId: new mongoose.Types.ObjectId(req.userId as string),
      type: 'text',
    });
    const otherSentMessage = await Message.exists({
      matchId: match._id,
      senderId: { $ne: new mongoose.Types.ObjectId(req.userId as string) },
      type: 'text',
    });

    // Ghosting: received messages but never replied before unmatching — penalise downward only
    if (otherSentMessage && !sentAMessage) {
      await UserModel.findByIdAndUpdate(req.userId, { $inc: { ghostCount: 1 } });
      const updated = await UserModel.findById(req.userId);
      if (updated) {
        const penalty = calcScore(Math.max(0, updated.gracefulExitCount), Math.max(0, updated.ghostCount));
        if (penalty < updated.accountabilityScore) {
          updated.accountabilityScore = penalty;
          await updated.save();
        }
      }
    } else {
      // Graceful exit — apply tiered penalty based on current score tier
      await UserModel.findByIdAndUpdate(req.userId, { $inc: { gracefulExitCount: 1 } });
      const current = await UserModel.findById(req.userId);
      if (current) {
        const penalty = unmatchPenalty(current.accountabilityScore);
        current.accountabilityScore = Math.max(0, current.accountabilityScore - penalty);
        await current.save();
      }
    }

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

    // Notify the other person in real-time so their discover unlocks immediately
    const otherEntry = match.users.find((u) => u.userId.toString() !== req.userId);
    if (otherEntry) {
      emitToUser(otherEntry.userId.toString(), 'match_ended', { matchId: match._id });
      const other = await findUserById(otherEntry.userId.toString());
      if (other?.pushSubscription) {
        const r = await sendPush(
          other.pushSubscription as unknown as webpush.PushSubscription,
          'Connection closed',
          `${me?.name ?? 'Your match'} has ended this conversation. You're free to connect again.`
        );
        if (r === 'expired') await getUserModel(other.gender).findByIdAndUpdate(other._id, { $set: { pushSubscription: null } });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Confirm meeting in person — requires both users; when both confirm the match closes positively
router.post('/:matchId/confirm-met', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const match = await Match.findOne({ _id: req.params.matchId, 'users.userId': req.userId });
    if (!match) { res.status(404).json({ message: 'Match not found' }); return; }

    const userId = new mongoose.Types.ObjectId(req.userId!);
    const alreadyConfirmed = match.metInPersonConfirmations.some((id) => id.toString() === req.userId);
    if (alreadyConfirmed) {
      const both = match.metInPersonConfirmations.length === 2;
      res.json({ status: 'already_confirmed', both }); return;
    }

    match.metInPersonConfirmations.push(userId);
    const both = match.metInPersonConfirmations.length === 2;

    if (both && match.active) {
      // Both confirmed — close the match as genuinely met
      match.active = false;
      match.conversationEndedAt = new Date();
      match.endReason = 'met_in_person';
      await match.save();

      // Give both users a graceful exit and allow score to recover
      for (const userEntry of match.users) {
        const uid = userEntry.userId.toString();
        const target = await findUserById(uid);
        if (!target) continue;
        const UModel = getUserModel(target.gender);
        await UModel.findByIdAndUpdate(uid, { $inc: { gracefulExitCount: 1 } });
        await recalculateScore(uid, target.gender);
      }

      // Remove from each other's likedUsers so discover reopens
      const [uA, uB] = match.users;
      const genderOf = (m: string) => m === 'MaleUser' ? 'male' : m === 'FemaleUser' ? 'female' : 'other';
      const MA = getUserModel(genderOf(uA.model));
      const MB = getUserModel(genderOf(uB.model));
      await Promise.all([
        MA.findByIdAndUpdate(uA.userId, { $pull: { likedUsers: uB.userId } }),
        MB.findByIdAndUpdate(uB.userId, { $pull: { likedUsers: uA.userId } }),
      ]);

      // System message visible to both
      const systemMsg = await Message.create({
        matchId: match._id,
        senderId: userId,
        text: 'Both of you confirmed meeting in person. We hope it was great! 🎉',
        type: 'graceful_exit',
      });

      const { io } = await import('../index');
      io.to((match._id as mongoose.Types.ObjectId).toString()).emit('new_message', systemMsg);

      // Notify each user their match closed positively
      for (const userEntry of match.users) {
        if (userEntry.userId.toString() === req.userId) continue;
        const other = await findUserById(userEntry.userId.toString());
        if (other?.pushSubscription) {
          await sendPush(
            other.pushSubscription as unknown as webpush.PushSubscription,
            'Connection closed — genuine ✓',
            'Both you and your match confirmed meeting in person. Your score is protected.'
          );
        }
        emitToUser(userEntry.userId.toString(), 'match_ended', { matchId: match._id });
      }
    } else {
      await match.save();
    }

    res.json({ status: 'confirmed', both });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Rate the exit reason — only the person who was unmatched can do this, once
router.patch('/:matchId/rate-exit', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rating } = req.body as { rating: 'genuine' | 'not_genuine' };
    if (!['genuine', 'not_genuine'].includes(rating)) {
      res.status(400).json({ message: 'Invalid rating' }); return;
    }

    const match = await Match.findById(req.params.matchId);
    if (!match || match.endReason !== 'graceful_exit') {
      res.status(404).json({ message: 'Match not found or no exit reason' }); return;
    }
    if (match.exitRatedBy) {
      res.status(409).json({ message: 'Already rated' }); return;
    }
    // Only the person who did NOT end the match can rate
    const endedBy = match.endedBy?.toString();
    if (endedBy === req.userId) {
      res.status(403).json({ message: 'You cannot rate your own exit' }); return;
    }

    match.exitRating = rating;
    match.exitRatedBy = new mongoose.Types.ObjectId(req.userId as string);
    await match.save();

    // Penalise the unmatcher if reason was rated as not genuine:
    // flip the amicable exit to non-amicable and recalculate
    if (rating === 'not_genuine' && endedBy) {
      const unmatcher = await findUserById(endedBy);
      if (unmatcher) {
        const UserModel = getUserModel(unmatcher.gender);
        await UserModel.findByIdAndUpdate(endedBy, {
          $inc: { ghostCount: 1, gracefulExitCount: -1 },
        });
        await recalculateScore(endedBy, unmatcher.gender);
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
  const amicable = Math.max(0, user.gracefulExitCount);
  const nonAmicable = Math.max(0, user.ghostCount);
  user.accountabilityScore = calcScore(amicable, nonAmicable);
  await user.save();
}

async function expireStaleMatches(userId: string) {
  const threshold = new Date(Date.now() - 72 * 60 * 60 * 1000);
  await Match.updateMany(
    { 'users.userId': userId, active: true, lastMessageAt: null, createdAt: { $lt: threshold } },
    { $set: { active: false, endReason: 'expired', conversationEndedAt: new Date() } }
  );
}

export { recalculateScore, expireStaleMatches };
export default router;
