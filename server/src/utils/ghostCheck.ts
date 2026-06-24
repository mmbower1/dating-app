import mongoose from 'mongoose';
import Match from '../models/Match';
import Message from '../models/Message';
import { getUserModel, findUserById } from '../models/User';
import { sendPush } from './push';
import type webpush from 'web-push';

const GHOST_TIMEOUT_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function checkStaleMatches(userId: string, gender: string) {
  const now = Date.now();

  const activeMatches = await Match.find({ 'users.userId': userId, active: true });

  for (const match of activeMatches) {
    const lastActivity = match.lastMessageAt ?? match.createdAt;
    if (now - new Date(lastActivity).getTime() < GHOST_TIMEOUT_MS) continue;

    // Determine who ghosted: whoever didn't send the last message
    let ghosterId: string | null = null;
    let victimId: string | null = null;

    if (match.lastMessageAt) {
      const lastMsg = await Message.findOne({ matchId: match._id }).sort({ createdAt: -1 });
      if (lastMsg) {
        // The person who sent the last message was waiting — the other ghosted
        const lastSenderId = lastMsg.senderId.toString();
        ghosterId = match.users.find((u) => u.userId.toString() !== lastSenderId)?.userId.toString() ?? null;
        victimId = lastSenderId;
      }
    } else {
      // No messages at all — both failed to initiate, penalize both
      ghosterId = match.users[0].userId.toString();
      victimId = match.users[1].userId.toString();
    }

    // Close the match
    match.active = false;
    match.conversationEndedAt = new Date();
    match.endReason = 'ghosted';
    if (ghosterId) match.ghostedUserId = new mongoose.Types.ObjectId(ghosterId);
    await match.save();

    // Drop a system message
    await Message.create({
      matchId: match._id,
      senderId: ghosterId
        ? new mongoose.Types.ObjectId(ghosterId)
        : new mongoose.Types.ObjectId(match.users[0].userId.toString()),
      text: 'This conversation was automatically closed after 48 hours of inactivity.',
      type: 'graceful_exit',
    });

    // Penalize the ghoster(s)
    const penalizeUser = async (id: string) => {
      const target = await findUserById(id);
      if (!target) return;
      const UserModel = getUserModel(target.gender);
      const updated = await UserModel.findByIdAndUpdate(id, { $inc: { ghostCount: 1 } }, { new: true });
      if (!updated) return;
      const ghostPenalty = Math.min(updated.ghostCount * 5, 40);
      const exitBonus = Math.min(updated.gracefulExitCount * 3, 20);
      const responseBonus = (updated.responseRate / 100) * 30;
      updated.accountabilityScore = Math.round(Math.max(0, Math.min(100, 50 + exitBonus + responseBonus - ghostPenalty)));
      await updated.save();
    };

    if (match.lastMessageAt && ghosterId) {
      await penalizeUser(ghosterId);
    } else {
      // Neither initiated — penalize both lightly (only one ghost point each)
      for (const u of match.users) await penalizeUser(u.userId.toString());
    }

    // Notify both users
    for (const userEntry of match.users) {
      const u = await findUserById(userEntry.userId.toString());
      if (!u?.pushSubscription) continue;
      const isGhoster = userEntry.userId.toString() === ghosterId;
      const title = isGhoster ? 'Connection closed' : 'Your match went quiet';
      const body = isGhoster
        ? 'You were removed from a match due to inactivity. Your score has been affected.'
        : `${match.users.find((x) => x.userId.toString() === ghosterId)?.name ?? 'Your match'} didn't respond. You're free to connect again.`;
      sendPush(u.pushSubscription as unknown as webpush.PushSubscription, title, body);
    }
  }
}
