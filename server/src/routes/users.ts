import { Router, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Readable } from 'stream';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { protect, AuthRequest } from '../middleware/auth';
import { getUserModel, getModelName, findUserById } from '../models/User';
import Match from '../models/Match';
import { vapidPublicKey } from '../utils/push';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
          return Model.find({ _id: { $nin: excludeList }, accountDisabled: { $ne: true }, ...ageFilter })
            .select('-password -likedUsers -passedUsers -blockedUsers')
            .limit(50);
        })
      );

    let candidates = (await query(excluded)).flat();
    if (candidates.length === 0) candidates = (await query(hardExcluded)).flat();

    // Apply optional filters (only when the preference is set AND candidate has the field set)
    const f = me.filters;
    if (f) {
      candidates = candidates.filter((c) => {
        if (f.ethnicities?.length && c.ethnicity) {
          if (!f.ethnicities.includes(c.ethnicity)) return false;
        }
        if (f.religions?.length && c.religion) {
          if (!f.religions.includes(c.religion)) return false;
        }
        if (f.heightMin != null && c.height != null && c.height < f.heightMin) return false;
        if (f.heightMax != null && c.height != null && c.height > f.heightMax) return false;
        if (f.hasChildren && f.hasChildren !== 'any' && c.hasChildren != null) {
          const want = f.hasChildren === 'yes';
          if (c.hasChildren !== want) return false;
        }
        if (f.drinks?.length && c.drinks) {
          if (!f.drinks.includes(c.drinks)) return false;
        }
        if (f.smokes?.length && c.smokes) {
          if (!f.smokes.includes(c.smokes)) return false;
        }
        if (f.politicalAssociations?.length && c.politicalAssociation) {
          if (!f.politicalAssociations.includes(c.politicalAssociation)) return false;
        }
        if (f.educationLevels?.length && c.educationLevel) {
          if (!f.educationLevels.includes(c.educationLevel)) return false;
        }
        if (f.maxDistance != null && me.location?.lat != null && me.location?.lng != null) {
          if (c.location?.lat != null && c.location?.lng != null) {
            const dist = haversineDistance(me.location.lat, me.location.lng, c.location.lat!, c.location.lng!);
            if (dist > f.maxDistance) return false;
          }
        }
        return true;
      });
    }

    res.json(candidates.slice(0, 20));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Update own profile
router.patch('/me', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allowed = [
      'name', 'bio', 'photos', 'location', 'age', 'agePreference', 'interestedIn',
      'name', 'age', 'ethnicity', 'religion', 'height', 'hasChildren', 'familyPlans',
      'drinks', 'smokes', 'politicalAssociation', 'educationLevel', 'zodiacSign', 'pets',
      'pronouns', 'sexuality', 'work', 'jobTitle', 'school', 'hometown', 'languages',
      'interestedIn', 'filters',
    ];
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

// Change email
router.patch('/me/email', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email: string };
    if (!email || !email.includes('@')) { res.status(400).json({ message: 'Valid email required' }); return; }
    const UserModel = getUserModel(req.userGender!);
    const user = await UserModel.findByIdAndUpdate(req.userId, { email: email.toLowerCase().trim() }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Change password
router.patch('/me/password', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters' }); return;
    }
    const UserModel = getUserModel(req.userGender!);
    const user = await UserModel.findById(req.userId);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) { res.status(401).json({ message: 'Current password is incorrect' }); return; }
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Delete account
router.delete('/me', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Match.updateMany(
      { 'users.userId': req.userId, active: true },
      { $set: { active: false, endReason: 'mutual', conversationEndedAt: new Date() } }
    );
    const UserModel = getUserModel(req.userGender!);
    await UserModel.findByIdAndDelete(req.userId);
    res.json({ success: true });
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

// Reorder profile photos
router.patch('/photos/reorder', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { photos } = req.body as { photos: string[] };
    if (!Array.isArray(photos)) { res.status(400).json({ message: 'Invalid photos' }); return; }
    const UserModel = getUserModel(req.userGender!);
    const user = await UserModel.findByIdAndUpdate(
      req.userId,
      { $set: { photos } },
      { new: true }
    );
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

// Toggle account visibility (disable hides from discover)
router.patch('/me/disable', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { disabled } = req.body as { disabled: boolean };
    const UserModel = getUserModel(req.userGender!);
    const user = await UserModel.findByIdAndUpdate(
      req.userId,
      { $set: { accountDisabled: disabled } },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// Return VAPID public key for frontend subscription
router.get('/vapid-public-key', (_req, res: Response) => {
  res.json({ key: vapidPublicKey });
});

// GET /users/blocked — return list of blocked users with name/photos populated
router.get('/blocked', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const UserModel = getUserModel(req.userGender!);
    const me = await UserModel.findById(req.userId).select('blockedUsers');
    if (!me) { res.status(404).json({ message: 'User not found' }); return; }

    const populated = await Promise.all(
      me.blockedUsers.map(async (id) => {
        const u = await findUserById(id.toString());
        if (!u) return null;
        return { _id: u._id, name: u.name, photos: u.photos, gender: u.gender };
      })
    );

    res.json(populated.filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// POST /users/:id/block — block a user
router.post('/:id/block', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = req.params.id as string;
    const UserModel = getUserModel(req.userGender!);
    await UserModel.findByIdAndUpdate(req.userId, {
      $addToSet: { blockedUsers: new mongoose.Types.ObjectId(targetId) },
      $pull: { likedUsers: new mongoose.Types.ObjectId(targetId) },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// DELETE /users/:id/block — unblock a user
router.delete('/:id/block', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = req.params.id as string;
    const UserModel = getUserModel(req.userGender!);
    await UserModel.findByIdAndUpdate(req.userId, {
      $pull: { blockedUsers: new mongoose.Types.ObjectId(targetId) },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});

export default router;
