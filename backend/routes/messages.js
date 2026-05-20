import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get list of users with whom the current user has chatted
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all messages involving the current user
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }]
    }).sort({ createdAt: -1 });

    // Track unique conversation partners
    const partnerIds = new Set();
    const latestMessages = {};

    messages.forEach(msg => {
      const partnerId = msg.sender.toString() === userId ? msg.recipient.toString() : msg.sender.toString();
      if (!partnerIds.has(partnerId)) {
        partnerIds.add(partnerId);
        latestMessages[partnerId] = msg;
      }
    });

    // Populate user profiles
    const conversationPartners = await User.find({
      _id: { $in: Array.from(partnerIds) }
    }).select('name role profile');

    // Build response array
    const conversations = conversationPartners.map(partner => {
      const partnerId = partner._id.toString();
      const lastMsg = latestMessages[partnerId];
      
      return {
        partner,
        lastMessage: lastMsg,
        unreadCount: 0 // Will compute below if necessary
      };
    });

    // Compute unread counts for each partner where they are the sender
    for (let conv of conversations) {
      const count = await Message.countDocuments({
        sender: conv.partner._id,
        recipient: userId,
        read: false
      });
      conv.unreadCount = count;
    }

    // Sort by last message time descending
    conversations.sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(0);
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(0);
      return dateB - dateA;
    });

    res.json(conversations);
  } catch (error) {
    console.error('Conversations fetch error:', error);
    res.status(500).json({ message: 'Server error fetching conversations' });
  }
});

// Get message history between current user and target user
router.get('/history/:recipientId', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const recipientId = req.params.recipientId;

    // Fetch messages in chronological order
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: recipientId },
        { sender: recipientId, recipient: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    // Mark recipient messages as read
    await Message.updateMany(
      { sender: recipientId, recipient: currentUserId, read: false },
      { $set: { read: true } }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving chat history' });
  }
});

export default router;
