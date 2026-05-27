import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Event from '../models/Event.js';
import Notification from '../models/Notification.js';
import Message from '../models/Message.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import cloudinary, { uploadProfileMedia } from '../config/cloudinary.js';

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

    // Only show verified users in the directory
    // query.isVerified = true; // Removed

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

    const isOwner = req.user.id === user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isConnected = user.connections.some(conn => conn._id.toString() === req.user.id);
    
    const targetIsAdmin = user.role === 'admin';

    if (user.isPrivate && !isOwner && !isAdmin && !isConnected && !targetIsAdmin) {
      // Create a masked copy of the user profile
      const maskedUser = user.toObject();
      maskedUser.email = '••••••••@••••.•••';
      maskedUser.profile = {
        avatar: user.profile?.avatar || '',
        cover: user.profile?.cover || '',
        bio: 'This account is private.',
        skills: [],
        department: 'Private',
        batch: 'Private',
        company: 'Private',
        jobTitle: 'Private',
        socialLinks: { linkedin: '', github: '', twitter: '', website: '' }
      };
      maskedUser.isPrivateMasked = true;
      return res.json(maskedUser);
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
});

// Update profile details
router.put('/profile', authMiddleware, uploadProfileMedia.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  try {
    const { bio, skills, department, batch, company, jobTitle, gender, education, college, socialLinks, isPrivate, experience } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update avatar from files or fallback to body if string passed
    if (req.files && req.files['avatar'] && req.files['avatar'][0]) {
      user.profile.avatar = req.files['avatar'][0].path || req.files['avatar'][0].secure_url;
    } else if (req.body.avatar !== undefined) {
      user.profile.avatar = req.body.avatar;
    }

    // Update cover from files or fallback to body if string passed
    if (req.files && req.files['cover'] && req.files['cover'][0]) {
      user.profile.cover = req.files['cover'][0].path || req.files['cover'][0].secure_url;
    } else if (req.body.cover !== undefined) {
      user.profile.cover = req.body.cover;
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
    if (gender !== undefined) user.profile.gender = gender;
    if (education !== undefined) user.profile.education = education;
    if (college !== undefined) user.profile.college = college;
    if (socialLinks !== undefined) user.profile.socialLinks = { ...user.profile.socialLinks, ...socialLinks };
    if (isPrivate !== undefined) user.isPrivate = isPrivate;
    if (experience !== undefined) user.profile.experience = experience;

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
router.post('/upload-avatar', authMiddleware, uploadProfileMedia.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let avatarUrl = '';
    if (req.file) {
      avatarUrl = req.file.path || req.file.secure_url;
    } else if (req.body.avatar) {
      avatarUrl = req.body.avatar;
    } else {
      return res.status(400).json({ message: 'Avatar data is required' });
    }

    user.profile.avatar = avatarUrl;
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

      // Create Notification
      try {
        const notif = new Notification({
          recipient: targetUserId,
          sender: currentUserId,
          type: 'connection',
          text: `${currentUser.name} connected with you`
        });
        await notif.save();
      } catch (nErr) {
        console.error('Notification creation failed for connection:', nErr);
      }
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
    const studentsCount = await User.countDocuments({ role: 'student' });
    const alumniCount = await User.countDocuments({ role: 'alumni' });
    const totalPosts = await Post.countDocuments();
    const totalEvents = await Event.countDocuments();

    res.json({
      totalUsers,
      studentsCount,
      alumniCount,
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



// Helper to extract cloudinary public ID
const extractPublicId = (url) => {
  if (!url) return null;
  try {
    // example url: https://res.cloudinary.com/cloud_name/image/upload/v1612345/maatram-alumniconnect/profiles/xyz.jpg
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    // Everything after /upload/v.../
    const pathParts = parts.slice(uploadIndex + 2); 
    const fullPath = pathParts.join('/');
    
    // Remove file extension
    const lastDotIndex = fullPath.lastIndexOf('.');
    if (lastDotIndex === -1) return fullPath;
    return fullPath.substring(0, lastDotIndex);
  } catch (err) {
    return null;
  }
};

// Admin: Delete/Ban User (Deep Deletion Cascade)
router.delete('/admin/delete/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.params.id;
    const user = await User.findById(userId).session(session);
    
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Administrators cannot be deleted through this interface' });
    }

    // --- 1. Cloudinary Cleanup ---
    try {
      // 1a. User profile media
      if (user.profile?.avatar) {
        const publicId = extractPublicId(user.profile.avatar);
        if (publicId) await cloudinary.uploader.destroy(publicId);
      }
      if (user.profile?.cover) {
        const publicId = extractPublicId(user.profile.cover);
        if (publicId) await cloudinary.uploader.destroy(publicId);
      }

      // 1b. User posts media
      const userPosts = await Post.find({ author: userId }).session(session);
      for (const post of userPosts) {
        if (post.image) {
          const publicId = extractPublicId(post.image);
          if (publicId) await cloudinary.uploader.destroy(publicId);
        }
      }

      // 1c. User events media
      const userEvents = await Event.find({ createdBy: userId }).session(session);
      for (const event of userEvents) {
        if (event.poster) {
          const publicId = extractPublicId(event.poster);
          if (publicId) await cloudinary.uploader.destroy(publicId);
        }
      }
    } catch (cloudErr) {
      console.warn('Cloudinary cleanup partially failed, continuing DB deletion:', cloudErr);
    }

    // --- 2. Database Deep Deletion ---
    
    // 2a. Delete their Posts
    await Post.deleteMany({ author: userId }, { session });
    
    // 2b. Delete their Events
    await Event.deleteMany({ createdBy: userId }, { session });
    
    // 2c. Delete their Messages (sent or received)
    await Message.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }, { session });
    
    // 2d. Delete their Notifications
    await Notification.deleteMany({ 
      $or: [{ sender: userId }, { recipient: userId }, { relatedUser: userId }] 
    }, { session });

    // 2e. Remove them from other Users' connections arrays
    await User.updateMany(
      { connections: userId },
      { $pull: { connections: userId } },
      { session }
    );

    // 2f. Remove them from Event registrations
    await Event.updateMany(
      { registrations: userId },
      { $pull: { registrations: userId } },
      { session }
    );

    // 2g. Remove them from Post interactions (likes, reactions, comments)
    await Post.updateMany(
      {},
      { 
        $pull: { 
          likes: userId,
          comments: { user: userId }
        }
      },
      { session }
    );
    // Remove from custom reactions array (Mongoose $pull matches subdocuments)
    await Post.updateMany(
      { "reactions.user": userId },
      { $pull: { reactions: { user: userId } } },
      { session }
    );

    // 2h. Finally, Delete the User
    await User.findByIdAndDelete(userId).session(session);

    await session.commitTransaction();
    session.endSession();

    console.log(`[Admin Activity] Deep deleted user: ${user.name} (${userId})`);

    // Optional: We can emit a socket event here using a global io if available
    // req.app.get('io')?.emit('user_deleted', { userId });

    res.json({ message: 'User account and all associated data successfully removed' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Deep Deletion Error:', error);
    res.status(500).json({ message: 'Server error during deep deletion' });
  }
});

export default router;
