import { Router, Request, Response } from 'express';
import { protect, requireAdmin, AuthRequest } from '../middleware/auth';
import { MaleUser, FemaleUser, OtherUser, findUserById, getUserModel } from '../models/User';
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

// Full wipe — clears all matches, messages, and swipe history for every user
router.delete('/wipe', protect, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Promise.all([
      Match.deleteMany({}),
      Message.deleteMany({}),
      MaleUser.updateMany({}, { $set: { likedUsers: [], passedUsers: [] } }),
      FemaleUser.updateMany({}, { $set: { likedUsers: [], passedUsers: [] } }),
      OtherUser.updateMany({}, { $set: { likedUsers: [], passedUsers: [] } }),
    ]);
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

// Get a user's swipe history with names populated
router.get('/users/:userId/swipes', protect, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const user = await findUserById(userId);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    const populateIds = (ids: unknown[]) =>
      Promise.all(ids.map(async (id) => {
        const u = await findUserById(id!.toString());
        return u ? { _id: u._id, name: u.name, gender: u.gender } : null;
      })).then((r) => r.filter(Boolean));

    const [liked, passed] = await Promise.all([
      populateIds(user.likedUsers),
      populateIds(user.passedUsers),
    ]);
    res.json({ liked, passed });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Remove one entry from likedUsers or passedUsers  (/liked | /passed)
router.delete('/users/:userId/swipes/:list/:targetId', protect, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, list, targetId } = req.params as { userId: string; list: string; targetId: string };
    if (list !== 'liked' && list !== 'passed') { res.status(400).json({ message: 'list must be liked or passed' }); return; }
    const field = list === 'liked' ? 'likedUsers' : 'passedUsers';
    const user = await findUserById(userId);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    await getUserModel(user.gender).findByIdAndUpdate(userId, { $pull: { [field]: targetId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Clear ALL swipes for a single user
router.delete('/users/:userId/swipes', protect, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const user = await findUserById(userId);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    await getUserModel(user.gender).findByIdAndUpdate(userId, { $set: { likedUsers: [], passedUsers: [] } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Force rescore — all users or a single user (?userId=...)
router.post('/rescore', protect, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = typeof req.query.userId === 'string' ? req.query.userId : null;

    const rescore = async (user: { _id: unknown; gender: string; ghostCount: number; responseRate: number }) => {
      const ghostPenalty = Math.min(user.ghostCount * 10, 50);
      const responsePenalty = Math.round((1 - user.responseRate / 100) * 30);
      const score = Math.max(0, Math.min(100, 100 - ghostPenalty - responsePenalty));
      await getUserModel(user.gender).findByIdAndUpdate(user._id, { $set: { accountabilityScore: score } });
      return score;
    };

    if (targetId) {
      const user = await findUserById(targetId);
      if (!user) { res.status(404).json({ message: 'User not found' }); return; }
      const score = await rescore(user);
      res.json({ success: true, userId: targetId, score });
    } else {
      const [males, females, others] = await Promise.all([
        MaleUser.find().select('gender ghostCount responseRate'),
        FemaleUser.find().select('gender ghostCount responseRate'),
        OtherUser.find().select('gender ghostCount responseRate'),
      ]);
      const all = [...males, ...females, ...others];
      await Promise.all(all.map(rescore));
      res.json({ success: true, rescored: all.length });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

export default router;
