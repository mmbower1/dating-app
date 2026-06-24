import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userGender?: string;
  isAdmin?: boolean;
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.isAdmin) {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
};

export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; gender: string; isAdmin?: boolean };
    req.userId = decoded.id;
    req.userGender = decoded.gender;
    req.isAdmin = decoded.isAdmin ?? false;
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};
