import express from 'express';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadToCloudinary } from '../middleware/cloudinary.js';

const router = express.Router();

// Get all feed posts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name role profile')
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
  try {
    const { caption, image } = req.body;
    if (!caption) {
      return res.status(400).json({ message: 'Caption is required' });
    }

    let mediaUrl = '';
    if (image) {
      if (image.startsWith('data:image/') || image.startsWith('data:video/')) {
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

    const populatedPost = await Post.findById(newPost._id)
      .populate('author', 'name role profile');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error creating post' });
  }
});

// Edit existing post
router.put('/:id', authMiddleware, async (req, res) => {
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
    
    const updatedPost = await Post.findById(post._id)
      .populate('author', 'name role profile')
      .populate('comments.user', 'name role profile')
      .populate('comments.replies.user', 'name role profile');

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Server error editing post' });
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

    const likeIdx = post.likes.indexOf(req.user.id);
    if (likeIdx > -1) {
      // Unlike
      post.likes.splice(likeIdx, 1);
    } else {
      // Like
      post.likes.push(req.user.id);
    }

    await post.save();
    res.json({ likes: post.likes, liked: likeIdx === -1 });
  } catch (error) {
    res.status(500).json({ message: 'Server error liking post' });
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

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'name role profile')
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
    res.json({ sharesCount: post.sharesCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error sharing post' });
  }
});

// Get posts by a specific user
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .populate('author', 'name role profile')
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

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'name role profile')
      .populate('comments.user', 'name role profile')
      .populate('comments.replies.user', 'name role profile');

    res.json(updatedPost);
  } catch (error) {
    console.error('Reply comment error:', error);
    res.status(500).json({ message: 'Server error adding reply' });
  }
});

export default router;
