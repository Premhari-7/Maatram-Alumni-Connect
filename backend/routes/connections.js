import express from 'express';
import User from '../models/User.js';
import ConnectionRequest from '../models/ConnectionRequest.js';
import Notification from '../models/Notification.js';
import { authMiddleware } from '../middleware/auth.js';
import { getSocketIdByUserId, getIO } from '../sockets/chat.js';

const router = express.Router();

// Helper: emit real-time notification to user if online
const emitNotificationToUser = (userId, notification) => {
  try {
    const io = getIO();
    const socketId = getSocketIdByUserId(userId.toString());
    if (io && socketId) {
      io.to(socketId).emit('new_notification', notification);
    }
  } catch (err) {
    console.error('Error emitting notification:', err);
  }
};

// GET /api/connections/status/:userId — Check connection status with a specific user
router.get('/status/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    // Check if already connected
    const currentUser = await User.findById(currentUserId);
    if (currentUser.connections.includes(targetUserId)) {
      return res.json({ status: 'connected' });
    }

    // Check for pending requests
    const sentRequest = await ConnectionRequest.findOne({
      sender: currentUserId,
      receiver: targetUserId,
      status: 'pending'
    });
    if (sentRequest) {
      return res.json({ status: 'pending_sent', requestId: sentRequest._id });
    }

    const receivedRequest = await ConnectionRequest.findOne({
      sender: targetUserId,
      receiver: currentUserId,
      status: 'pending'
    });
    if (receivedRequest) {
      return res.json({ status: 'pending_received', requestId: receivedRequest._id });
    }

    return res.json({ status: 'none' });
  } catch (error) {
    console.error('Error checking connection status:', error);
    res.status(500).json({ message: 'Server error checking connection status' });
  }
});

// POST /api/connections/request — Send connection request
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'You cannot connect with yourself' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Already connected check
    if (currentUser.connections.includes(targetUserId)) {
      return res.status(400).json({ message: 'Already connected with this user' });
    }

    // Check for existing pending request
    const existingRequest = await ConnectionRequest.findOne({
      $or: [
        { sender: currentUserId, receiver: targetUserId, status: 'pending' },
        { sender: targetUserId, receiver: currentUserId, status: 'pending' }
      ]
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'A connection request is already pending' });
    }

    // If target user is public, connect immediately
    if (!targetUser.isPrivate) {
      currentUser.connections.push(targetUserId);
      targetUser.connections.push(currentUserId);
      await currentUser.save();
      await targetUser.save();

      const notif = new Notification({
        recipient: targetUserId,
        sender: currentUserId,
        type: 'connection',
        relatedUser: currentUserId,
        text: `${currentUser.name} connected with you`
      });
      await notif.save();
      await notif.populate('sender', 'name role profile.avatar');
      emitNotificationToUser(targetUserId, notif);

      return res.json({
        status: 'connected',
        message: 'You are now connected!'
      });
    }

    // Create a pending request for private accounts
    const newRequest = new ConnectionRequest({
      sender: currentUserId,
      receiver: targetUserId,
      status: 'pending'
    });
    await newRequest.save();

    // Create notification for receiver
    const notif = new Notification({
      recipient: targetUserId,
      sender: currentUserId,
      type: 'connection_request',
      relatedUser: currentUserId,
      relatedConnectionRequest: newRequest._id,
      text: `${currentUser.name} wants to connect with you`
    });
    await notif.save();
    await notif.populate('sender', 'name role profile.avatar');
    emitNotificationToUser(targetUserId, notif);

    return res.json({
      status: 'pending',
      message: 'Connection request sent. Waiting for approval.',
      requestId: newRequest._id
    });
  } catch (error) {
    console.error('Connection request error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A connection request already exists' });
    }
    res.status(500).json({ message: 'Server error processing connection request' });
  }
});

// POST /api/connections/accept/:requestId — Accept a pending connection request
router.post('/accept/:requestId', authMiddleware, async (req, res) => {
  try {
    const request = await ConnectionRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: 'Connection request not found' });
    }

    if (request.receiver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    if (request.status !== 'pending') {
      // It's already processed. Delete the notification to clean up.
      await Notification.deleteOne({ recipient: req.user.id, relatedConnectionRequest: request._id });
      return res.json({ status: 'already_processed', message: 'This request has already been processed' });
    }

    // Update request status
    request.status = 'accepted';
    await request.save();

    // Add to both users' connections
    const sender = await User.findById(request.sender);
    const receiver = await User.findById(request.receiver);

    if (!sender.connections.includes(request.receiver)) {
      sender.connections.push(request.receiver);
      await sender.save();
    }
    if (!receiver.connections.includes(request.sender)) {
      receiver.connections.push(request.sender);
      await receiver.save();
    }

    // Send notification to the original sender that their request was accepted
    const notif = new Notification({
      recipient: request.sender,
      sender: request.receiver,
      type: 'connection_accepted',
      relatedUser: request.receiver,
      text: `${receiver.name} is now connected with you.`
    });
    await notif.save();
    const populatedNotif = await Notification.findById(notif._id)
      .populate('sender', 'name role profile.avatar');
    emitNotificationToUser(request.sender, populatedNotif);

    // Delete the notification received by the receiver
    try {
      const existingNotif = await Notification.findOne({
        recipient: req.user.id,
        relatedConnectionRequest: request._id
      });
      if (existingNotif) {
        await existingNotif.deleteOne();
      }
    } catch (err) {
      console.error('Error deleting self notification on accept:', err);
    }

    res.json({
      status: 'connected',
      message: 'Connection request accepted!'
    });
  } catch (error) {
    console.error('Accept connection error:', error);
    res.status(500).json({ message: 'Server error accepting connection request' });
  }
});

// POST /api/connections/reject/:requestId — Reject a pending connection request
router.post('/reject/:requestId', authMiddleware, async (req, res) => {
  try {
    const request = await ConnectionRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: 'Connection request not found' });
    }

    if (request.receiver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    if (request.status !== 'pending') {
      // It's already processed. Delete the notification to clean up.
      await Notification.deleteOne({ recipient: req.user.id, relatedConnectionRequest: request._id });
      return res.json({ status: 'already_processed', message: 'This request has already been processed' });
    }

    request.status = 'rejected';
    await request.save();

    // Delete the notification received by the receiver
    try {
      const existingNotif = await Notification.findOne({
        recipient: req.user.id,
        relatedConnectionRequest: request._id
      });
      if (existingNotif) {
        await existingNotif.deleteOne();
      }
    } catch (err) {
      console.error('Error deleting self notification on reject:', err);
    }

    res.json({
      status: 'rejected',
      message: 'Connection request rejected.'
    });
  } catch (error) {
    console.error('Reject connection error:', error);
    res.status(500).json({ message: 'Server error rejecting connection request' });
  }
});

// POST /api/connections/disconnect/:userId — Disconnect from a user
router.post('/disconnect/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from both connections arrays
    currentUser.connections = currentUser.connections.filter(id => id.toString() !== targetUserId);
    targetUser.connections = targetUser.connections.filter(id => id.toString() !== currentUserId);
    await currentUser.save();
    await targetUser.save();

    // Delete any connection requests between them
    await ConnectionRequest.deleteMany({
      $or: [
        { sender: currentUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: currentUserId }
      ]
    });

    res.json({
      status: 'disconnected',
      message: 'Successfully disconnected.',
      connectionsCount: currentUser.connections.length
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ message: 'Server error disconnecting' });
  }
});

// GET /api/connections/pending — Get all pending requests received by current user
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const requests = await ConnectionRequest.find({
      receiver: req.user.id,
      status: 'pending'
    })
      .populate('sender', 'name role profile.avatar profile.department profile.batch profile.company profile.jobTitle')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ message: 'Server error fetching pending requests' });
  }
});

// GET /api/connections/sent — Get all pending requests sent by current user
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    const requests = await ConnectionRequest.find({
      sender: req.user.id,
      status: 'pending'
    })
      .populate('receiver', 'name role profile.avatar profile.department profile.batch profile.company')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching sent requests:', error);
    res.status(500).json({ message: 'Server error fetching sent requests' });
  }
});

export default router;
