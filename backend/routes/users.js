import express from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Event from '../models/Event.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { uploadToCloudinary } from '../middleware/cloudinary.js';

const router = express.Router();

// Public Statistics for Landing Page
router.get('/public/stats', async (req, res) => {
  try {
    const studentsCount = await User.countDocuments({ role: 'student' });
    const alumniCount = await User.countDocuments({ role: 'alumni' });
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalEvents = await Event.countDocuments();
    
    res.json({
      students: studentsCount,
      alumni: alumniCount,
      totalUsers,
      posts: totalPosts,
      events: totalEvents
    });
  } catch (error) {
    console.error('Fetch public stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
});

// Public Featured Alumni for Landing Page testimonials
router.get('/public/featured-alumni', async (req, res) => {
  try {
    // Get verified alumni who have a bio set
    const featuredAlumni = await User.find({
      role: 'alumni',
      isVerified: true,
      'profile.bio': { $exists: true, $ne: '' }
    })
    .select('name profile.bio profile.company profile.jobTitle profile.batch profile.avatar')
    .limit(6)
    .sort({ createdAt: -1 });
    
    res.json(featuredAlumni);
  } catch (error) {
    console.error('Fetch featured alumni error:', error);
    res.status(500).json({ message: 'Server error fetching featured alumni' });
  }
});

// Public Upcoming Events for Landing Page
router.get('/public/events', async (req, res) => {
  try {
    const upcomingEvents = await Event.find({
      date: { $gte: new Date() }
    })
    .sort({ date: 1 })
    .limit(3)
    .populate('createdBy', 'name');
    
    res.json(upcomingEvents);
  } catch (error) {
    console.error('Fetch public events error:', error);
    res.status(500).json({ message: 'Server error fetching public events' });
  }
});

// Search and list users with filters (skills, department, batch, company)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, skills, department, batch, company } = req.query;
    let query = {};

    // Don't show the logged-in user in list
    query._id = { $ne: req.user.id };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (skills) {
      // skills query separated by commas
      const skillArr = skills.split(',').map(s => s.trim());
      query['profile.skills'] = { $in: skillArr.map(s => new RegExp(s, 'i')) };
    }

    if (department) {
      query['profile.department'] = { $regex: department, $options: 'i' };
    }

    if (batch) {
      query['profile.batch'] = { $regex: batch, $options: 'i' };
    }

    if (company) {
      query['profile.company'] = { $regex: company, $options: 'i' };
    }

    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// Get detailed user profile by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('connections', 'name email role profile');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
});

// Update profile details
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { avatar, cover, bio, skills, department, batch, company, jobTitle, socialLinks } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields with Cloudinary direct base64 check
    if (avatar !== undefined) {
      if (avatar && avatar.startsWith('data:image/')) {
        user.profile.avatar = await uploadToCloudinary(avatar, 'avatars');
      } else {
        user.profile.avatar = avatar;
      }
    }
    if (cover !== undefined) {
      if (cover && cover.startsWith('data:image/')) {
        user.profile.cover = await uploadToCloudinary(cover, 'covers');
      } else {
        user.profile.cover = cover;
      }
    }
    if (bio !== undefined) user.profile.bio = bio;
    if (skills !== undefined) {
      user.profile.skills = Array.isArray(skills) 
        ? skills 
        : skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (department !== undefined) user.profile.department = department;
    if (batch !== undefined) user.profile.batch = batch;
    if (company !== undefined) user.profile.company = company;
    if (jobTitle !== undefined) user.profile.jobTitle = jobTitle;
    if (socialLinks !== undefined) user.profile.socialLinks = { ...user.profile.socialLinks, ...socialLinks };

    await user.save();
    
    // Return updated user
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Upload profile avatar directly
router.post('/upload-avatar', authMiddleware, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) {
      return res.status(400).json({ message: 'Avatar data is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Upload direct base64 to Cloudinary
    const cloudinaryUrl = await uploadToCloudinary(avatar, 'avatars');
    user.profile.avatar = cloudinaryUrl;
    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    console.error('Avatar upload endpoint error:', error);
    res.status(500).json({ message: 'Server error uploading avatar' });
  }
});

// Toggle connection (follow/connect)
router.post('/connect/:id', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'You cannot connect with yourself' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isConnected = currentUser.connections.includes(targetUserId);

    if (isConnected) {
      // Disconnect
      currentUser.connections = currentUser.connections.filter(id => id.toString() !== targetUserId);
      targetUser.connections = targetUser.connections.filter(id => id.toString() !== currentUserId);
    } else {
      // Connect
      currentUser.connections.push(targetUserId);
      targetUser.connections.push(currentUserId);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      connected: !isConnected,
      connectionsCount: currentUser.connections.length
    });
  } catch (error) {
    console.error('Toggle connection error:', error);
    res.status(500).json({ message: 'Server error updating connections' });
  }
});

// --- ADMIN SPECIFIC ENDPOINTS ---

// Admin: Get Analytics (Total users, posts, events, verified count)
router.get('/admin/analytics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const studentsCount = await User.countDocuments({ role: 'student', isVerified: true });
    const alumniCount = await User.countDocuments({ role: 'alumni', isVerified: true });
    const unverifiedAlumniCount = await User.countDocuments({ role: { $in: ['alumni', 'student'] }, isVerified: false });
    const totalPosts = await Post.countDocuments();
    const totalEvents = await Event.countDocuments();

    res.json({
      totalUsers,
      studentsCount,
      alumniCount,
      unverifiedAlumniCount,
      totalPosts,
      totalEvents
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

// Admin: Get all users list
router.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching user list' });
  }
});

// Admin: Verify Alumni/Student
router.post('/admin/verify/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'alumni' && user.role !== 'student') {
      return res.status(400).json({ message: 'Only alumni and student accounts require verification' });
    }

    user.isVerified = true;
    await user.save();

    res.json({ message: `${user.role === 'alumni' ? 'Alumni' : 'Student'} account for ${user.name} has been successfully verified`, isVerified: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error verifying user' });
  }
});

// Admin: Delete/Ban User
router.delete('/admin/delete/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Administrators cannot be deleted through this interface' });
    }

    await User.findByIdAndDelete(req.params.id);
    // Delete their posts too
    await Post.deleteMany({ author: req.params.id });

    res.json({ message: 'User account and associated content successfully removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

export default router;
