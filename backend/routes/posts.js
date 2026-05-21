import express from 'express';
import Post from '../models/Post.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadToCloudinary } from '../middleware/cloudinary.js';

const router = express.Router();

// Get all feed posts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name role profile')
      .populate('likes', 'name role profile')
      .populate('reactions.user', 'name role profile')
      .populate('comments.user', 'name role profile')
      .populate('comments.replies.user', 'name role profile')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching feed' });
  }
});

// Get a single post by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name role profile')
      .populate('likes', 'name role profile')
      .populate('reactions.user', 'name role profile')
      .populate('comments.user', 'name role profile')
      .populate('comments.replies.user', 'name role profile');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching post' });
  }
});

// Create new post
router.post('/', authMiddleware, async (req, res) => {
  console.log('--- POST /api/posts requested ---');
  console.log('User:', req.user);
  console.log('Payload caption:', req.body?.caption);
  console.log('Payload image length/presence:', req.body?.image ? req.body.image.substring(0, 100) + '...' : 'none');

  try {
    const { caption, image } = req.body;
    if (!caption) {
      console.log('Validation failed: Caption is missing or empty');
      return res.status(400).json({ message: 'Caption is required' });
    }

    let mediaUrl = '';
    if (image) {
      if (image.startsWith('data:image/') || image.startsWith('data:video/')) {
        console.log('Uploading base64 image/video to Cloudinary...');
        mediaUrl = await uploadToCloudinary(image, 'posts');
      } else {
        mediaUrl = image;
      }
    }

    const newPost = new Post({
      author: req.user.id,
      caption,
      image: mediaUrl
    });

    await newPost.save();
    console.log('Post saved successfully inside DB!');

    const populatedPost = await Post.findById(newPost._id)
      .populate('author', 'name role profile')
      .populate('likes', 'name role profile')
      .populate('reactions.user', 'name role profile');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Create post error details:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error creating post: ' + error.message });
  }
});

// Edit existing post
router.put('/:id', authMiddleware, async (req, res) => {
  console.log('--- PUT /api/posts/:id requested ---');
  console.log('ID:', req.params.id);
  console.log('User:', req.user);
  console.log('Payload caption:', req.body?.caption);
  console.log('Payload image length/presence:', req.body?.image ? 'present' : 'none');

  try {
    const { caption, image } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only creator can edit
    if (post.author.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to edit this post' });
    }

    if (caption) post.caption = caption;
    if (image !== undefined) post.image = image;

    await post.save();
    console.log('Post updated successfully inside DB!');
    
    const updatedPost = await Post.findById(post._id)
      .populate('author', 'name role profile')
      .populate('likes', 'name role profile')
      .populate('reactions.user', 'name role profile')
      .populate('comments.user', 'name role profile')
      .populate('comments.replies.user', 'name role profile');

    res.json(updatedPost);
  } catch (error) {
    console.error('Edit post error details:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error editing post: ' + error.message });
  }
});

// Delete post (Creator or Admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only creator or admin can delete
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'User not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting post' });
  }
});

// Toggle Like
router.post('/like/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!post.reactions) {
      post.reactions = [];
    }

    const likeIdx = post.likes.indexOf(req.user.id);
    const reactIdx = post.reactions.findIndex(r => r.user.toString() === req.user.id);

    if (likeIdx > -1) {
      // Unlike
      post.likes.splice(likeIdx, 1);
      if (reactIdx > -1) {
        post.reactions.splice(reactIdx, 1);
      }
    } else {
      // Like
      post.likes.push(req.user.id);
      if (reactIdx > -1) {
        post.reactions[reactIdx].type = 'like';
      } else {
        post.reactions.push({ user: req.user.id, type: 'like' });
      }

      // Trigger notification if not liking own post
      if (post.author.toString() !== req.user.id) {
        try {
          const likingUser = await User.findById(req.user.id);
          const notif = new Notification({
            recipient: post.author,
            sender: req.user.id,
            type: 'like',
            relatedPost: post._id,
            text: `${likingUser.name} liked your post`
          });
          await notif.save();
        } catch (nErr) {
          console.error('Notification creation failed for like:', nErr);
        }
      }
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'name role profile')
      .populate('likes', 'name role profile')
      .populate('reactions.user', 'name role profile')
      .populate('comments.user', 'name role profile')
      .populate('comments.replies.user', 'name role profile');

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Server error liking post' });
  }
});

// Toggle Reaction
router.post('/react/:id', authMiddleware, async (req, res) => {
  try {
    const { type } = req.body; // 'like', 'funny', 'celebrate'
    if (!type || !['like', 'funny', 'celebrate'].includes(type)) {
      return res.status(400).json({ message: 'Reaction type must be like, funny, or celebrate' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!post.reactions) {
      post.reactions = [];
    }

    const reactIdx = post.reactions.findIndex(r => r.user.toString() === req.user.id);
    const likeIdx = post.likes.indexOf(req.user.id);

    if (reactIdx > -1) {
      // User has already reacted. Check if it's the same reaction
      if (post.reactions[reactIdx].type === type) {
        // Toggle OFF (remove reaction)
        post.reactions.splice(reactIdx, 1);
        if (likeIdx > -1) {
          post.likes.splice(likeIdx, 1);
        }
      } else {
        // Change reaction type
        post.reactions[reactIdx].type = type;
        if (likeIdx === -1) {
          post.likes.push(req.user.id);
        }
      }
    } else {
      // New reaction
      post.reactions.push({ user: req.user.id, type });
      if (likeIdx === -1) {
        post.likes.push(req.user.id);
      }

      // Trigger notification if not reacting to own post
      if (post.author.toString() !== req.user.id) {
        try {
          const reactingUser = await User.findById(req.user.id);
          const notif = new Notification({
            recipient: post.author,
            sender: req.user.id,
            type: 'like',
            relatedPost: post._id,
            text: `${reactingUser.name} reacted to your post`
          });
          await notif.save();
        } catch (nErr) {
          console.error('Notification creation failed for reaction:', nErr);
        }
      }
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'name role profile')
      .populate('likes', 'name role profile')
      .populate('reactions.user', 'name role profile')
      .populate('comments.user', 'name role profile')
      .populate('comments.replies.user', 'name role profile');

    res.json(updatedPost);
  } catch (error) {
    console.error('Reaction error:', error);
    res.status(500).json({ message: 'Server error reacting to post' });
  }
});

// Add Comment
router.post('/comment/:id', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({
      user: req.user.id,
      text
    });

    await post.save();

    // Trigger notification if not commenting on own post
    if (post.author.toString() !== req.user.id) {
      try {
        const commenterUser = await User.findById(req.user.id);
        const notif = new Notification({
          recipient: post.author,
          sender: req.user.id,
          type: 'comment',
          relatedPost: post._id,
          text: `${commenterUser.name} commented on your post`
        });
        await notif.save();
      } catch (nErr) {
        console.error('Notification creation failed for comment:', nErr);
      }
    }

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'name role profile')
      .populate('likes', 'name role profile')
      .populate('reactions.user', 'name role profile')
      .populate('comments.user', 'name role profile')
      .populate('comments.replies.user', 'name role profile');

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Server error adding comment' });
  }
});

// Toggle Save Post
router.post('/save/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const postIdx = user.savedPosts.indexOf(req.params.id);
    let saved = false;

    if (postIdx > -1) {
      user.savedPosts.splice(postIdx, 1);
    } else {
      user.savedPosts.push(req.params.id);
      saved = true;
    }

    await user.save();
    res.json({ saved, savedPosts: user.savedPosts });
  } catch (error) {
    res.status(500).json({ message: 'Server error saving post' });
  }
});

// Increment Repost/Share count
router.post('/share/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.sharesCount += 1;
    await post.save();

    // Trigger notification if not sharing own post
    if (post.author.toString() !== req.user.id) {
      try {
        const sharingUser = await User.findById(req.user.id);
        const notif = new Notification({
          recipient: post.author,
          sender: req.user.id,
          type: 'share',
          relatedPost: post._id,
          text: `${sharingUser.name} shared your post`
        });
        await notif.save();
      } catch (nErr) {
        console.error('Notification creation failed for share:', nErr);
      }
    }

    res.json({ sharesCount: post.sharesCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error sharing post' });
  }
});

// Toggle Repost / Share
router.post('/repost/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const post = await Post.findById(req.params.id);
    if (!user || !post) {
      return res.status(404).json({ message: 'User or Post not found' });
    }

    if (!user.reposts) {
      user.reposts = [];
    }

    const index = user.reposts.indexOf(post._id);
    let reposted = false;

    if (index > -1) {
      user.reposts.splice(index, 1);
      post.sharesCount = Math.max(0, post.sharesCount - 1);
    } else {
      user.reposts.push(post._id);
      post.sharesCount += 1;
      reposted = true;

      // Trigger notification if not reposting own post
      if (post.author.toString() !== req.user.id) {
        try {
          const notif = new Notification({
            recipient: post.author,
            sender: req.user.id,
            type: 'share',
            relatedPost: post._id,
            text: `${user.name} reposted your post`
          });
          await notif.save();
        } catch (nErr) {
          console.error('Notification creation failed for repost:', nErr);
        }
      }
    }

    await user.save();
    await post.save();

    res.json({ reposted, sharesCount: post.sharesCount, reposts: user.reposts });
  } catch (error) {
    console.error('Repost error:', error);
    res.status(500).json({ message: 'Server error reposting' });
  }
});

// Get posts reposted by a user
router.get('/user/:userId/reposts', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isOwner = req.user.id === targetUser._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isConnected = targetUser.connections.includes(req.user.id);

    if (targetUser.isPrivate && !isOwner && !isAdmin && !isConnected) {
      return res.json([]);
    }

    const repostedPosts = await Post.find({ _id: { $in: targetUser.reposts || [] } })
      .populate('author', 'name role profile')
      .populate('likes', 'name role profile')
      .populate('reactions.user', 'name role profile')
      .populate('comments.user', 'name role profile')
      .populate('comments.replies.user', 'name role profile')
      .sort({ createdAt: -1 });

    res.json(repostedPosts);
  } catch (error) {
    console.error('Fetch user reposts error:', error);
    res.status(500).json({ message: 'Server error fetching reposts' });
  }
});

// Get posts by a specific user
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isOwner = req.user.id === targetUser._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isConnected = targetUser.connections.includes(req.user.id);

    if (targetUser.isPrivate && !isOwner && !isAdmin && !isConnected) {
      return res.json([]);
    }

    const posts = await Post.find({ author: req.params.userId })
      .populate('author', 'name role profile')
      .populate('likes', 'name role profile')
      .populate('reactions.user', 'name role profile')
      .populate('comments.user', 'name role profile')
      .populate('comments.replies.user', 'name role profile')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching user posts' });
  }
});

// Toggle Like on a Comment
router.post('/comment/:postId/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (!comment.likes) {
      comment.likes = [];
    }

    const likeIdx = comment.likes.indexOf(req.user.id);
    if (likeIdx > -1) {
      // Unlike
      comment.likes.splice(likeIdx, 1);
    } else {
      // Like
      comment.likes.push(req.user.id);
    }

    await post.save();
    
    const updatedPost = await Post.findById(post._id)
      .populate('author', 'name role profile')
      .populate('likes', 'name role profile')
      .populate('reactions.user', 'name role profile')
      .populate('comments.user', 'name role profile')
      .populate('comments.replies.user', 'name role profile');

    res.json(updatedPost);
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ message: 'Server error liking comment' });
  }
});

// Add Reply to a Comment
router.post('/comment/:postId/:commentId/reply', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Reply text is required' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (!comment.replies) {
      comment.replies = [];
    }

    comment.replies.push({
      user: req.user.id,
      text
    });

    await post.save();

    // Trigger notification if not replying to own comment
    if (comment.user.toString() !== req.user.id) {
      try {
        const replyUser = await User.findById(req.user.id);
        const notif = new Notification({
          recipient: comment.user,
          sender: req.user.id,
          type: 'reply',
          relatedPost: post._id,
          text: `${replyUser.name} replied to your comment`
        });
        await notif.save();
      } catch (nErr) {
        console.error('Notification creation failed for reply:', nErr);
      }
    }

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'name role profile')
      .populate('likes', 'name role profile')
      .populate('reactions.user', 'name role profile')
      .populate('comments.user', 'name role profile')
      .populate('comments.replies.user', 'name role profile');

    res.json(updatedPost);
  } catch (error) {
    console.error('Reply comment error:', error);
    res.status(500).json({ message: 'Server error adding reply' });
  }
});

export default router;
