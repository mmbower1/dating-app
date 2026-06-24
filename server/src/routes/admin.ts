import { Router, Request, Response } from 'express';
import { protect, requireAdmin, AuthRequest } from '../middleware/auth';
import { MaleUser, FemaleUser, OtherUser, findUserById } from '../models/User';
import Match from '../models/Match';
import Message from '../models/Message';

const router = Router();

// Promote a user to admin — requires ADMIN_SECRET header
router.post('/promote', async (req: Request, res: Response): Promise<void> => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    res.status(403).json({ message: 'Invalid admin secret' });
    return;
  }

  const { email } = req.body;
  if (!email) { res.status(400).json({ message: 'Email required' }); return; }

  const [male, female, other] = await Promise.all([
    MaleUser.findOne({ email }),
    FemaleUser.findOne({ email }),
    OtherUser.findOne({ email }),
  ]);
  const user = male ?? female ?? other;
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  user.isAdmin = true;
  await user.save();
  res.json({ message: `${user.name} is now an admin` });
});

// Get all matches
router.get('/matches', protect, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matches = await Match.find().sort({ createdAt: -1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Delete a match and its messages
router.delete('/matches/:matchId', protect, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Promise.all([
      Match.findByIdAndDelete(req.params.matchId as string),
      Message.deleteMany({ matchId: req.params.matchId }),
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Get all messages (optionally filtered by matchId)
router.get('/messages', protect, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = req.query.matchId ? { matchId: req.query.matchId as string } : {};
    const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Delete a single message
router.delete('/messages/:messageId', protect, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Message.findByIdAndDelete(req.params.messageId as string);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Get all users across all collections
router.get('/users', protect, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [males, females, others] = await Promise.all([
      MaleUser.find().select('-password'),
      FemaleUser.find().select('-password'),
      OtherUser.find().select('-password'),
    ]);
    res.json({ males, females, others });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

export default router;
