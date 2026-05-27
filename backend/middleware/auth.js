import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'maatram_secret_key_123456';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists in DB
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User account has been removed by admin' });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Administrator privileges required' });
  }
};

export const adminOrAlumniMiddleware = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'alumni')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Administrator or Alumni privileges required' });
  }
};
