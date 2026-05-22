import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'maatram_secret_key_123456';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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
