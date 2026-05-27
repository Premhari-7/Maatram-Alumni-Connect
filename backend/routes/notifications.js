import express from 'express';
import Notification from '../models/Notification.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get notifications for logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'name role profile.avatar')
      .populate('relatedPost', 'caption')
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error fetching notifications', error: error.toString() });
  }
});

// Mark a single notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
});

// Mark all notifications as read for logged-in user
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error marking all notifications as read' });
  }
});

// Delete all notifications for current user
router.delete('/clear-all', authMiddleware, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });
    res.json({ message: 'All notifications cleared successfully' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: 'Server error clearing notifications' });
  }
});

// Delete single notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Notification.deleteOne({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
});

export default router;
