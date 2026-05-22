import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['connection', 'like', 'comment', 'reply', 'event', 'share', 'connection_request', 'connection_accepted', 'connection_rejected', 'message'],
    required: true
  },
  relatedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedConnectionRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConnectionRequest'
  },
  text: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000 // TTL: Auto-delete after 30 days (30 * 24 * 60 * 60 seconds)
  }
});

export default mongoose.model('Notification', NotificationSchema);
