import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'maatram_secret_key_123456';
const ADMIN_SECRET = '25112006';

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, secretAdminCode } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please enter all required fields' });
    }



    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!gmailRegex.test(email)) {
      return res.status(400).json({ message: 'Email must be a valid Gmail address (ending with @gmail.com)' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Role checks
    if (role === 'admin') {
      if (secretAdminCode !== ADMIN_SECRET) {
        return res.status(400).json({ message: 'Invalid Admin Secret Code' });
      }
    } else if (role !== 'student' && role !== 'alumni') {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role
    });

    await newUser.save();

    // Sign JWT
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profile: newUser.profile
      }
    });

  } catch (error) {
    console.error('Registration Error:', error);

    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password, role, secretAdminCode } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Please enter all required fields' });
    }

    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!gmailRegex.test(email)) {
      return res.status(400).json({ message: 'Email must be a valid Gmail address (ending with @gmail.com)' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // For Admin role, check the Secret Code
    if (role === 'admin') {
      if (secretAdminCode !== ADMIN_SECRET) {
        return res.status(400).json({ message: 'Invalid Admin Secret Code' });
      }
    }

    // Check user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'User does not exist. Please register first.' });
    }

    // Validate role matches
    if (user.role !== role) {
      return res.status(400).json({ message: 'Incorrect role selected for this account' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password.' });
    }



    // Generating token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user details
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'No token' });

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
