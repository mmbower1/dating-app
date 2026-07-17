import Match from '../models/Match';
import Message from '../models/Message';
import { findUserById, getUserModel } from '../models/User';

const TICK_MS = 18 * 60 * 60 * 1000;  // 18 hours per penalty tick
const GHOST_MS = 48 * 60 * 60 * 1000; // ghost check owns anything beyond 48 h

export async function checkSlowResponders(): Promise<void> {
  const now = Date.now();

  // Only consider matches where the last message landed between 18 h and 48 h ago.
  // Null lastMessageAt (no messages yet) is intentionally excluded.
  const staleMatches = await Match.find({
    active: true,
    lastMessageAt: {
      $lte: new Date(now - TICK_MS),
      $gt:  new Date(now - GHOST_MS),
    },
  });

  for (const match of staleMatches) {
    if (!match.lastMessageAt) continue;

    const elapsed = now - new Date(match.lastMessageAt).getTime();
    const ticksDue = Math.floor(elapsed / TICK_MS);
    const newTicks = ticksDue - match.slowResponsePenalties;
    if (newTicks <= 0) continue;

    // Who needs to respond? The user who did NOT send the last message.
    const lastMsg = await Message.findOne(
      { matchId: match._id, type: { $ne: 'graceful_exit' } }
    ).sort({ createdAt: -1 });
    if (!lastMsg) continue;

    const pendingUserId = match.users
      .find((u) => u.userId.toString() !== lastMsg.senderId.toString())
      ?.userId.toString();
    if (!pendingUserId) continue;

    const target = await findUserById(pendingUserId);
    if (!target) continue;

    const UserModel = getUserModel(target.gender);
    const newScore = Math.max(0, target.accountabilityScore - newTicks);
    await UserModel.findByIdAndUpdate(pendingUserId, {
      $set: { accountabilityScore: newScore },
    });

    match.slowResponsePenalties = ticksDue;
    await match.save();
  }
}
