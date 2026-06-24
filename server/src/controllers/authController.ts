import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserModel, MaleUser, FemaleUser, OtherUser } from '../models/User';
import type { AuthRequest } from '../middleware/auth';

const signToken = (id: string, gender: string, isAdmin = false) =>
  jwt.sign({ id, gender, isAdmin }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, age, gender, interestedIn, phone } = req.body;

    if (!name || !email || !password || !age || !gender || !interestedIn) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    // Check across all collections for duplicate email
    const [existingMale, existingFemale, existingOther] = await Promise.all([
      MaleUser.findOne({ email }),
      FemaleUser.findOne({ email }),
      OtherUser.findOne({ email }),
    ]);
    if (existingMale || existingFemale || existingOther) {
      res.status(400).json({ message: 'Email already in use' });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const UserModel = getUserModel(gender);
    const user = await UserModel.create({ name, email, password: hashed, age, gender, interestedIn, phone });

    const token = signToken(user._id.toString(), user.gender, user.isAdmin);
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        interestedIn: user.interestedIn,
        bio: user.bio,
        photos: user.photos,
        accountabilityScore: user.accountabilityScore,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password required' });
      return;
    }

    // Search all three collections
    const [maleUser, femaleUser, otherUser] = await Promise.all([
      MaleUser.findOne({ email }),
      FemaleUser.findOne({ email }),
      OtherUser.findOne({ email }),
    ]);
    const user = maleUser ?? femaleUser ?? otherUser;

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = signToken(user._id.toString(), user.gender, user.isAdmin);
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        interestedIn: user.interestedIn,
        bio: user.bio,
        photos: user.photos,
        accountabilityScore: user.accountabilityScore,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const UserModel = getUserModel(req.userGender!);
    const user = await UserModel.findById(req.userId).select('-password -likedUsers -passedUsers -blockedUsers');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
