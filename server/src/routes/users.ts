import { Router, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Readable } from 'stream';
import { protect, AuthRequest } from '../middleware/auth';
import { getUserModel, getModelName } from '../models/User';
import Match from '../models/Match';
import { vapidPublicKey } from '../utils/push';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();

// Get potential matches across the relevant gender collections
router.get('/discover', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const UserModel = getUserModel(req.userGender!);
    const me = await UserModel.findById(req.userId);
    if (!me) { res.status(404).json({ message: 'User not found' }); return; }

    const activeMatch = await Match.findOne({ 'users.userId': me._id, active: true });
    if (activeMatch) { res.json({ locked: true }); return; }

    const hardExcluded = [me._id, ...me.likedUsers, ...me.blockedUsers];
    const excluded = [...hardExcluded, ...me.passedUsers];

    const interests = me.interestedIn.length > 0 ? me.interestedIn : ['male', 'female', 'non-binary', 'other'];
    const modelsToQuery = [...new Set(interests.map((g) => getModelName(g)))];

    const ageMin = me.agePreference?.min ?? 18;
    const ageMax = me.agePreference?.max ?? 99;

    const query = (excludeList: typeof hardExcluded) =>
      Promise.all(
        modelsToQuery.map((modelName) => {
          const Model = getUserModel(modelName === 'MaleUser' ? 'male' : modelName === 'FemaleUser' ? 'female' : 'other');
          const ageFilter = (ageMin > 18 || ageMax < 99) ? { age: { $gte: ageMin, $lte: ageMax } } : {};
          return Model.find({
            _id: { $nin: excludeList },
            ...ageFilter,
          })
            .select('-password -likedUsers -passedUsers -blockedUsers')
            .limit(20);
        })
      );

    let candidates = (await query(excluded)).flat();
    if (candidates.length === 0) {
      candidates = (await query(hardExcluded)).flat();
    }

    res.json(candidates.slice(0, 20));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Update own profile
router.patch('/me', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allowed = ['name', 'bio', 'photos', 'location', 'age', 'agePreference', 'interestedIn'];
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

// Upload a profile photo to Cloudinary
router.post('/upload-photo', protect, upload.single('photo'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ message: 'No file provided' }); return; }
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      res.status(503).json({ message: 'Photo uploads not configured' });
      return;
    }

    const url = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'pearl-dating', transformation: [{ width: 800, height: 1000, crop: 'fill', quality: 'auto' }] },
        (err, result) => { if (err || !result) reject(err); else resolve(result.secure_url); }
      );
      Readable.from(req.file!.buffer).pipe(stream);
    });

    // Append photo URL to user's photos array (max 6)
    const UserModel = getUserModel(req.userGender!);
    const user = await UserModel.findById(req.userId);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    if (user.photos.length >= 6) {
      res.status(400).json({ message: 'Maximum 6 photos allowed' });
      return;
    }

    user.photos.push(url);
    await user.save();

    res.json({ url, photos: user.photos });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err });
  }
});

// Delete a profile photo
router.delete('/photo', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url } = req.body as { url: string };
    const UserModel = getUserModel(req.userGender!);
    const user = await UserModel.findByIdAndUpdate(
      req.userId,
      { $pull: { photos: url } },
      { new: true }
    ).select('-password');
    res.json({ photos: user?.photos ?? [] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Save push subscription
router.post('/push-subscribe', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const UserModel = getUserModel(req.userGender!);
    await UserModel.findByIdAndUpdate(req.userId, { pushSubscription: req.body });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Return VAPID public key for frontend subscription
router.get('/vapid-public-key', (_req, res: Response) => {
  res.json({ key: vapidPublicKey });
});

export default router;
