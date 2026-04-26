import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-releasepilot-key-2026';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.error('🛑 [AUTH ERROR]: No token provided in headers');
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.error(`🛑 [AUTH ERROR]: ${err.message}`);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    (req as any).user = user;
    next(); // Valid! Let them through.
  });
};
