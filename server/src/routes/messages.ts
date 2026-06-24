import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Message from '../models/Message';
import Match from '../models/Match';
import { findUserById } from '../models/User';
import mongoose from 'mongoose';
import { sendPush } from '../utils/push';
import type webpush from 'web-push';

const router = Router();

// Get messages for a match
router.get('/:matchId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const match = await Match.findOne({ _id: req.params.matchId as string, 'users.userId': req.userId });
    if (!match) { res.status(404).json({ message: 'Match not found' }); return; }

    const messages = await Message.find({ matchId: req.params.matchId }).sort({ createdAt: 1 });

    await Message.updateMany(
      { matchId: req.params.matchId, senderId: { $ne: req.userId }, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Send a message
router.post('/:matchId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const match = await Match.findOne({ _id: req.params.matchId as string, 'users.userId': req.userId, active: true });
    if (!match) { res.status(404).json({ message: 'Match not found or closed' }); return; }

    const { text } = req.body;
    if (!text?.trim()) { res.status(400).json({ message: 'Message text required' }); return; }

    const message = await Message.create({
      matchId: new mongoose.Types.ObjectId(req.params.matchId as string),
      senderId: new mongoose.Types.ObjectId(req.userId as string),
      text: text.trim(),
    });

    match.lastMessageAt = new Date();
    await match.save();

    // Notify the other user
    const otherEntry = match.users.find((u) => u.userId.toString() !== req.userId);
    if (otherEntry) {
      const otherUser = await findUserById(otherEntry.userId.toString());
      if (otherUser?.pushSubscription) {
        const sender = await findUserById(req.userId!);
        sendPush(
          otherUser.pushSubscription as unknown as webpush.PushSubscription,
          `New message from ${sender?.name ?? 'Someone'}`,
          text.trim().slice(0, 80)
        );
      }
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

export default router;
