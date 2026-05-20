import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'student', 'alumni'],
    required: true
  },
  isVerified: {
    type: Boolean,
    default: function() {
      // By default, alumni need admin verification. Admin and students are verified immediately.
      return this.role !== 'alumni';
    }
  },
  profile: {
    avatar: {
      type: String,
      default: ''
    },
    cover: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: ''
    },
    skills: {
      type: [String],
      default: []
    },
    department: {
      type: String,
      default: ''
    },
    batch: {
      type: String,
      default: ''
    },
    company: {
      type: String,
      default: ''
    },
    jobTitle: {
      type: String,
      default: ''
    },
    socialLinks: {
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      twitter: { type: String, default: '' },
      website: { type: String, default: '' }
    }
  },
  connections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  savedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('User', UserSchema);
