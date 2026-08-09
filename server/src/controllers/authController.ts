import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getUserModel, findUserById, MaleUser, FemaleUser, OtherUser } from '../models/User';
import type { AuthRequest } from '../middleware/auth';
import { checkStaleMatches } from '../utils/ghostCheck';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PW,
  },
});

const signToken = (id: string, gender: string, isAdmin = false) =>
  jwt.sign({ id, gender, isAdmin }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, age, dateOfBirth, gender, interestedIn, phone } = req.body;

    if (!name || !email || !password || !gender || !interestedIn) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    // Calculate age from dateOfBirth if provided, otherwise use age directly
    let resolvedAge: number;
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        res.status(400).json({ message: 'Invalid date of birth' });
        return;
      }
      const today = new Date();
      resolvedAge = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        resolvedAge--;
      }
      if (resolvedAge < 18) {
        res.status(400).json({ message: 'You must be 18 or older to register' });
        return;
      }
    } else if (age) {
      resolvedAge = Number(age);
      if (resolvedAge < 18) {
        res.status(400).json({ message: 'You must be 18 or older to register' });
        return;
      }
    } else {
      res.status(400).json({ message: 'Age or date of birth is required' });
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
    const user = await UserModel.create({
      name, email, password: hashed, age: resolvedAge,
      dateOfBirth: dateOfBirth ?? '', gender, interestedIn, phone,
    });

    const token = signToken(user._id.toString(), user.gender, user.isAdmin);
    const { password: _pw, likedUsers: _lu, passedUsers: _pu, blockedUsers: _bu, ...safeUser } = user.toObject();
    res.status(201).json({ token, user: safeUser });
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
    const { password: _pw, likedUsers: _lu, passedUsers: _pu, blockedUsers: _bu, ...safeUser } = user.toObject();
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Run ghost check in background — don't await so it doesn't slow down app load
    checkStaleMatches(req.userId!, req.userGender!).catch(() => {});
    const user = await findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email: string };
    if (!email) { res.status(400).json({ message: 'Email is required' }); return; }

    const [maleUser, femaleUser, otherUser] = await Promise.all([
      MaleUser.findOne({ email }),
      FemaleUser.findOne({ email }),
      OtherUser.findOne({ email }),
    ]);
    const user = maleUser ?? femaleUser ?? otherUser;

    // Always respond success to avoid revealing whether an account exists
    if (!user) { res.json({ message: 'If that email is registered, a reset link has been sent.' }); return; }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const UserModel = getUserModel(user.gender);
    await UserModel.findByIdAndUpdate(user._id, {
      $set: { resetPasswordToken: token, resetPasswordExpiry: expiry },
    });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"Lockheart" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Reset your Lockheart password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#1a1d2e;color:#f2f5fb;border-radius:16px;">
          <h2 style="margin:0 0 8px;font-size:24px;">Reset your password</h2>
          <p style="color:#9ba8be;margin:0 0 24px;">Click the button below to set a new password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7eb3f5,#b39dfa);color:#fff;font-weight:600;font-size:16px;border-radius:12px;text-decoration:none;">Reset password</a>
          <p style="color:#606a82;font-size:13px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body as { token: string; password: string };
    if (!token || !password) { res.status(400).json({ message: 'Token and password are required' }); return; }
    if (password.length < 6) { res.status(400).json({ message: 'Password must be at least 6 characters' }); return; }

    const [maleUser, femaleUser, otherUser] = await Promise.all([
      MaleUser.findOne({ resetPasswordToken: token, resetPasswordExpiry: { $gt: new Date() } }),
      FemaleUser.findOne({ resetPasswordToken: token, resetPasswordExpiry: { $gt: new Date() } }),
      OtherUser.findOne({ resetPasswordToken: token, resetPasswordExpiry: { $gt: new Date() } }),
    ]);
    const user = maleUser ?? femaleUser ?? otherUser;

    if (!user) { res.status(400).json({ message: 'Reset link is invalid or has expired.' }); return; }

    const hashed = await bcrypt.hash(password, 12);
    const UserModel = getUserModel(user.gender);
    await UserModel.findByIdAndUpdate(user._id, {
      $set: { password: hashed, resetPasswordToken: null, resetPasswordExpiry: null },
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
