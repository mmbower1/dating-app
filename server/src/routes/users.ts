import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { getUserModel, getModelName } from '../models/User';

const router = Router();

// Get potential matches across the relevant gender collections
router.get('/discover', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const UserModel = getUserModel(req.userGender!);
    const me = await UserModel.findById(req.userId);
    if (!me) { res.status(404).json({ message: 'User not found' }); return; }

    const excluded = [me._id, ...me.likedUsers, ...me.passedUsers, ...me.blockedUsers];

    // Query each collection that matches one of the user's interestedIn genders
    const modelsToQuery = [...new Set(me.interestedIn.map((g) => getModelName(g)))];
    const results = await Promise.all(
      modelsToQuery.map((modelName) => {
        const Model = getUserModel(modelName === 'MaleUser' ? 'male' : modelName === 'FemaleUser' ? 'female' : 'other');
        return Model.find({
          _id: { $nin: excluded },
          interestedIn: me.gender,
        })
          .select('-password -likedUsers -passedUsers -blockedUsers')
          .limit(20);
      })
    );

    const candidates = results.flat().slice(0, 20);
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

    const UserModel = getUserModel(req.userGender!);
    const user = await UserModel.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

export default router;
