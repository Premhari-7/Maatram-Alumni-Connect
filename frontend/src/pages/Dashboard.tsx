import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { TreeAnimation } from '../components/TreeAnimation';
import { FiUsers, FiFileText, FiCalendar, FiAward, FiPlus, FiHeart, FiMessageSquare, FiSend, FiBookmark, FiTrash2, FiShare2, FiCopy, FiLinkedin, FiTwitter, FiX } from 'react-icons/fi';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface Post {
  _id: string;
  author: {
    _id: string;
    name: string;
    role: string;
    profile: {
      avatar: string;
      batch: string;
      company: string;
    };
  };
  caption: string;
  image: string;
  likes: string[];
  comments: any[];
  sharesCount: number;
  createdAt: string;
}

export const Dashboard = () => {
  const { user, token, isMockMode, toggleSavePost } = useAuth();
  const { showNotification } = useNotification();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Modal create post
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [showPostConfirm, setShowPostConfirm] = useState(false);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);

  // Comment drawers
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Load feed posts
  const fetchPosts = async () => {
    if (isMockMode) {
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        setPosts(JSON.parse(mockPostsStr));
      } else {
        // Start with empty feed - users create their own posts
        setPosts([]);
      }
      setLoadingPosts(false);
    } else {
      try {
        const res = await axios.get(`${API_URL}/posts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(res.data);
      } catch (err) {
        console.error('Error fetching posts:', err);
      } finally {
        setLoadingPosts(false);
      }
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [isMockMode]);

  // Handle Like
  const handleLike = async (postId: string) => {
    if (!user) return;
    if (isMockMode) {
      const updated = posts.map(p => {
        if (p._id === postId) {
          const liked = p.likes.includes(user.id);
          const likesList = liked ? p.likes.filter(id => id !== user.id) : [...p.likes, user.id];
          return { ...p, likes: likesList };
        }
        return p;
      });
      setPosts(updated);
      localStorage.setItem('mock_db_posts', JSON.stringify(updated));
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/like/${postId}`);
        setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: res.data.likes } : p));
      } catch (err) {
        console.error('Error liking post:', err);
      }
    }
  };

  // Handle Post Creation
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) return;
    setShowPostConfirm(true);
  };

  const handleFileChange = (file: File) => {
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
      setMediaFile(file);
      setIsUploading(false);
    };
    reader.onerror = () => {
      showNotification('Error', 'Failed to read file', 'error');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const submitPost = async () => {
    setShowPostConfirm(false);
    
    if (isMockMode) {
      const newPost: Post = {
        _id: 'post_' + Date.now(),
        author: {
          _id: user?.id || '',
          name: user?.name || '',
          role: user?.role || '',
          profile: {
            avatar: user?.profile?.avatar || '',
            batch: user?.profile?.batch || '',
            company: user?.profile?.company || ''
          }
        },
        caption,
        image: mediaPreview || '',
        likes: [],
        comments: [],
        sharesCount: 0,
        createdAt: new Date().toISOString()
      };

      const updated = [newPost, ...posts];
      setPosts(updated);
      localStorage.setItem('mock_db_posts', JSON.stringify(updated));
      setCaption('');
      setMediaFile(null);
      setMediaPreview('');
      setIsPostModalOpen(false);
      showNotification('Post Created', 'Your post has been successfully shared.', 'success');
    } else {
      try {
        const res = await axios.post(
          `${API_URL}/posts`,
          { caption, image: mediaPreview },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setPosts(prev => [res.data, ...prev]);
        setCaption('');
        setMediaFile(null);
        setMediaPreview('');
        setIsPostModalOpen(false);
        showNotification('Post Created', 'Your post has been successfully shared.', 'success');
      } catch (err) {
        console.error('Failed to create post:', err);
        showNotification('Error', 'Failed to create post', 'error');
      }
    }
  };

  const handleShare = async (postId: string) => {
    if (isMockMode) {
      const updated = posts.map(p => {
        if (p._id === postId) {
          return { ...p, sharesCount: p.sharesCount + 1 };
        }
        return p;
      });
      setPosts(updated);
      localStorage.setItem('mock_db_posts', JSON.stringify(updated));
      showNotification('Post Reposted', 'Post shared to your connections.', 'success');
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/share/${postId}`);
        setPosts(prev => prev.map(p => p._id === postId ? { ...p, sharesCount: res.data.sharesCount } : p));
        showNotification('Post Reposted', 'Post shared to your connections.', 'success');
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  // Handle Comment Submission
  const handleCommentSubmit = async (postId: string) => {
    if (!commentText.trim()) return;

    if (isMockMode) {
      const updated = posts.map(p => {
        if (p._id === postId) {
          const newComment = {
            _id: 'c_' + Date.now(),
            user: {
              _id: user?.id || '',
              name: user?.name || '',
              profile: { avatar: user?.profile?.avatar || '' }
            },
            text: commentText,
            createdAt: new Date().toISOString()
          };
          return { ...p, comments: [...p.comments, newComment] };
        }
        return p;
      });
      setPosts(updated);
      localStorage.setItem('mock_db_posts', JSON.stringify(updated));
      setCommentText('');
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/comment/${postId}`, { text: commentText });
        setPosts(prev => prev.map(p => p._id === postId ? res.data : p));
        setCommentText('');
      } catch (err) {
        console.error('Error commenting:', err);
      }
    }
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (isMockMode) {
      const updated = posts.filter(p => p._id !== postId);
      setPosts(updated);
      localStorage.setItem('mock_db_posts', JSON.stringify(updated));
      showNotification('Post Deleted', 'Your post has been successfully removed.', 'success');
    } else {
      try {
        await axios.delete(`${API_URL}/posts/${postId}`);
        setPosts(prev => prev.filter(p => p._id !== postId));
        showNotification('Post Deleted', 'Your post has been successfully removed.', 'success');
      } catch (err) {
        console.error('Error deleting post:', err);
      }
    }
  };

  // Save post
  const handleSavePost = async (postId: string) => {
    await toggleSavePost(postId);
  };

  return (
    <div style={{ padding: '10px 0', fontFamily: 'var(--font-body)' }}>
      {/* Top Banner area */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 800,
            fontFamily: 'var(--font-title)',
            letterSpacing: '-0.5px'
          }}>
            Welcome back, <span style={{ color: 'var(--color-yellow-primary)' }}>{user?.name.split(' ')[0]}</span>!
          </h1>
          <p style={{ color: 'var(--color-text-gray)', fontSize: '14px', marginTop: '4px' }}>
            Let's continue building connections and creating impact.
          </p>
        </div>
        
        <button
          onClick={() => setIsPostModalOpen(true)}
          className="btn-primary"
          style={{ gap: '8px' }}
        >
          <FiPlus size={18} /> Create Post
        </button>
      </div>



      {/* Main Dashboard Layout Split */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 0.6fr',
        gap: '30px',
        alignItems: 'start'
      }} className="dashboard-body-grid">
        
        {/* Left Column: Recent Posts feed stream */}
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 700,
            fontFamily: 'var(--font-title)',
            marginBottom: '16px',
            letterSpacing: '0.5px'
          }}>
            Recent Updates
          </h3>

          {loadingPosts ? (
            <div style={{ color: 'var(--color-text-gray)', fontSize: '14px' }}>Loading feed...</div>
          ) : posts.length === 0 ? (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
              No posts found. Be the first to share an update!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {posts.map((post) => {
                const isLiked = user ? post.likes.includes(user.id) : false;
                const isSaved = user?.savedPosts?.includes(post._id) || false;
                const authorMeta = post.author.profile?.company ? `${post.author.role === 'alumni' ? 'Alumni' : 'Student'} - ${post.author.profile.company}` : `${post.author.role === 'alumni' ? 'Alumni' : 'Student'}`;
                const batchMeta = post.author.profile?.batch ? ` (${post.author.profile.batch})` : '';

                return (
                  <div 
                    key={post._id} 
                    className="glass-panel" 
                    style={{ 
                      padding: '24px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '16px',
                      borderColor: 'rgba(255,215,0,0.08)'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <img
                          src={post.author.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={post.author.name}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1.5px solid var(--color-yellow-primary)'
                          }}
                        />
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                            {post.author.name}
                          </h4>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-gray)' }}>
                            {authorMeta}{batchMeta}
                          </span>
                        </div>
                      </div>
                      
                      {/* Delete option if Admin or Creator */}
                      {(user?.role === 'admin' || user?.id === post.author._id) && (
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            transition: 'color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ff4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Caption */}
                    <p style={{ fontSize: '14px', color: '#e0e0e0', lineHeight: '1.6' }}>
                      {post.caption}
                    </p>

                    {/* Post Image/Video */}
                    {post.image && (
                      <div style={{
                        borderRadius: '10px',
                        overflow: 'hidden',
                        maxHeight: '340px',
                        border: '1px solid var(--color-border-glass)',
                        background: '#000000'
                      }}>
                        {post.image.startsWith('data:video/') || post.image.match(/\.(mp4|webm|ogg|mov)($|\?)/i) ? (
                          <video
                            src={post.image}
                            controls
                            style={{ width: '100%', maxHeight: '340px', objectFit: 'contain', display: 'block' }}
                          />
                        ) : (
                          <img
                            src={post.image}
                            alt="Post Media"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        )}
                      </div>
                    )}

                    {/* Likes & Comments Summary */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: 'var(--color-text-muted)',
                      borderBottom: '1px solid var(--color-border-glass)',
                      paddingBottom: '10px'
                    }}>
                      <span>{post.likes.length} Likes</span>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span>{post.comments.length} Comments</span>
                        <span>{post.sharesCount} Reposts</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0'
                    }}>
                      <button
                        onClick={() => handleLike(post._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isLiked ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          transition: 'color 0.2s ease'
                        }}
                      >
                        <FiHeart fill={isLiked ? 'var(--color-yellow-primary)' : 'none'} size={18} />
                        <span>Like</span>
                      </button>

                      <button
                        onClick={() => setActiveCommentsPostId(activeCommentsPostId === post._id ? null : post._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: activeCommentsPostId === post._id ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        <FiMessageSquare size={18} />
                        <span>Comment</span>
                      </button>

                      <button
                        onClick={() => setSharingPost(post)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-gray)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        <FiShare2 size={18} />
                        <span>Repost</span>
                      </button>

                      <button
                        onClick={() => handleSavePost(post._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isSaved ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        <FiBookmark fill={isSaved ? 'var(--color-yellow-primary)' : 'none'} size={18} />
                        <span>Save</span>
                      </button>
                    </div>

                    {/* Comments Drawer Expansion */}
                    <AnimatePresence>
                      {activeCommentsPostId === post._id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{
                            overflow: 'hidden',
                            borderTop: '1px solid var(--color-border-glass)',
                            paddingTop: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          {/* List comments */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                            {post.comments.map((comment, index) => (
                              <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px' }}>
                                <img
                                  src={comment.user.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                                  alt={comment.user.name}
                                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                                <div style={{
                                  background: 'rgba(255,255,255,0.03)',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  flex: 1
                                }}>
                                  <h5 style={{ fontWeight: 700, color: 'var(--color-yellow-primary)' }}>{comment.user.name}</h5>
                                  <p style={{ color: '#d0d0d0', marginTop: '2px' }}>{comment.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Write comment */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              style={{
                                flex: 1,
                                background: 'rgba(10,10,10,0.8)',
                                border: '1px solid var(--color-border-glass)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: '#ffffff',
                                fontSize: '13px',
                                outline: 'none'
                              }}
                            />
                            <button
                              onClick={() => handleCommentSubmit(post._id)}
                              style={{
                                background: 'var(--color-yellow-primary)',
                                color: '#000000',
                                border: 'none',
                                borderRadius: '8px',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <FiSend size={14} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Mini Info Cards */}
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 700,
            fontFamily: 'var(--font-title)',
            marginBottom: '16px',
            letterSpacing: '0.5px'
          }}>
            Mentorship Channels
          </h3>

          {/* Golden floating graduation cap widget */}
          <div className="glass-panel" style={{ 
            padding: '0', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            height: '240px',
            marginBottom: '20px',
            borderColor: 'rgba(255, 215, 0, 0.15)',
            position: 'relative'
          }}>
            <TreeAnimation progress={1.0} isLoggedIn={true} />
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              right: '12px',
              background: 'rgba(5, 5, 5, 0.75)',
              backdropFilter: 'blur(8px)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 215, 0, 0.1)',
              textAlign: 'center',
              zIndex: 10
            }}>
              <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Maatram Alumni Connect
              </span>
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderColor: 'rgba(255, 215, 0, 0.08)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-yellow-primary)' }}>Need Career Guidance?</h4>
            <p style={{ fontSize: '12px', color: 'var(--color-text-gray)', lineHeight: '1.6' }}>
              Connect with senior alumni in target companies through our Connections directory, or type questions to our chatbot at the bottom-right corner!
            </p>
            <div style={{ borderTop: '1px solid var(--color-border-glass)', paddingTop: '14px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Powered by Maatram Alumni Connect
            </div>
          </div>
        </div>

      </div>

      {/* Create Post Dialog Overlay Modal */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="notification-overlay" onClick={() => setIsPostModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel"
              style={{
                width: '90%',
                maxHeight: '90vh',
                maxWidth: '500px',
                padding: '24px',
                border: '1px solid var(--color-yellow-primary)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-title)', marginBottom: '16px', color: '#ffffff' }}>
                Share an Update
              </h3>
              
              <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Post Caption</label>
                  <textarea
                    required
                    placeholder="Share achievements, webinar alerts, or mentorship offers..."
                    rows={4}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(10, 10, 10, 0.7)',
                      border: '1px solid var(--color-border-glass)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontFamily: 'var(--font-body)',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Upload Photo or Video</label>
                  
                  {!mediaPreview ? (
                    <div
                      style={{
                        border: '2px dashed rgba(255, 215, 0, 0.3)',
                        borderRadius: '8px',
                        padding: '24px',
                        textAlign: 'center',
                        background: 'rgba(255, 215, 0, 0.02)',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = 'var(--color-yellow-primary)';
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileChange(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => document.getElementById('dashboard-media-input')?.click()}
                    >
                      <FiPlus size={24} style={{ color: 'var(--color-yellow-primary)' }} />
                      <span style={{ fontSize: '13px', color: '#e0e0e0', fontWeight: 555 }}>
                        Drag & drop or click to upload
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Supports JPEG, PNG, MP4, WebM (Max 10MB)
                      </span>
                      <input
                        type="file"
                        id="dashboard-media-input"
                        accept="image/*,video/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileChange(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border-glass)' }}>
                      {mediaPreview.startsWith('data:video/') ? (
                        <video
                          src={mediaPreview}
                          controls
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', background: '#000000' }}
                        />
                      ) : (
                        <img
                          src={mediaPreview}
                          alt="Preview"
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview('');
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(0, 0, 0, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#ff4444'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'}
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsPostModalOpen(false)}
                    className="btn-outline"
                    style={{ flex: 1, justifyItems: 'center', justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, justifyItems: 'center', justifyContent: 'center' }}
                  >
                    Publish Post
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Creation Confirmation Modal */}
      <AnimatePresence>
        {showPostConfirm && (
          <div className="notification-overlay" style={{ zIndex: 1100 }} onClick={() => setShowPostConfirm(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel"
              style={{
                width: '90%',
                maxWidth: '400px',
                padding: '24px',
                textAlign: 'center',
                border: '1px solid var(--color-yellow-primary)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-title)', marginBottom: '12px', color: '#ffffff' }}>
                Confirm Publication
              </h3>
              
              <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', lineHeight: '1.5', marginBottom: '24px' }}>
                Confirm Post: Are you ready to publish this update to the Maatram community feed?
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowPostConfirm(false)}
                  className="btn-outline"
                  style={{ flex: 1, justifyItems: 'center', justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitPost}
                  className="btn-primary"
                  style={{ flex: 1, justifyItems: 'center', justifyContent: 'center' }}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Centered Glassmorphic External Share Dialog */}
      <AnimatePresence>
        {sharingPost && (
          <div 
            className="notification-overlay" 
            style={{ zIndex: 1200 }} 
            onClick={() => setSharingPost(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel"
              style={{
                width: '90%',
                maxWidth: '420px',
                padding: '28px 24px',
                textAlign: 'center',
                border: '1px solid var(--color-yellow-primary)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                background: 'rgba(10, 10, 10, 0.95)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)', margin: 0 }}>
                  Share Opportunity
                </h3>
                <button
                  onClick={() => setSharingPost(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                >
                  <FiX size={20} />
                </button>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--color-text-gray)', lineHeight: '1.6', marginBottom: '24px', textAlign: 'left' }}>
                Choose how you want to share this update to expand its reach.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Option 1: Repost Internally */}
                <button
                  onClick={() => {
                    handleShare(sharingPost._id);
                    setSharingPost(null);
                  }}
                  className="btn-primary"
                  style={{
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '12px',
                    fontSize: '14px',
                    width: '100%'
                  }}
                >
                  <FiShare2 size={16} /> Repost Internally
                </button>

                {/* Option 2: Share on LinkedIn */}
                <button
                  onClick={() => {
                    const text = `${sharingPost.author.name} shared an update on Maatram Alumni Connect: "${sharingPost.caption.substring(0, 120)}..."`;
                    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://maatramfoundation.org')}&text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank', 'width=600,height=600,noopener,noreferrer');
                    setSharingPost(null);
                    showNotification('Success', 'LinkedIn sharing window opened.', 'success');
                  }}
                  className="btn-outline"
                  style={{
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '12px',
                    fontSize: '14px',
                    borderColor: '#0077b5',
                    color: '#0077b5',
                    background: 'rgba(0, 119, 181, 0.05)',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#0077b5';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 119, 181, 0.05)';
                    e.currentTarget.style.color = '#0077b5';
                  }}
                >
                  <FiLinkedin size={16} /> Share on LinkedIn
                </button>

                {/* Option 3: Share on Twitter / X */}
                <button
                  onClick={() => {
                    const text = `${sharingPost.author.name} on Maatram Alumni Connect: "${sharingPost.caption.substring(0, 140)}..."`;
                    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://maatramfoundation.org')}`;
                    window.open(url, '_blank', 'width=600,height=600,noopener,noreferrer');
                    setSharingPost(null);
                    showNotification('Success', 'Twitter sharing window opened.', 'success');
                  }}
                  className="btn-outline"
                  style={{
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '12px',
                    fontSize: '14px',
                    borderColor: '#1da1f2',
                    color: '#1da1f2',
                    background: 'rgba(29, 161, 242, 0.05)',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1da1f2';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(29, 161, 242, 0.05)';
                    e.currentTarget.style.color = '#1da1f2';
                  }}
                >
                  <FiTwitter size={16} /> Share on Twitter / X
                </button>

                {/* Option 4: Copy Link */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://maatramfoundation.org/posts/${sharingPost._id}`);
                    showNotification('Link Copied', 'Post link copied to clipboard.', 'success');
                    setSharingPost(null);
                  }}
                  className="btn-outline"
                  style={{
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '12px',
                    fontSize: '14px',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    width: '100%'
                  }}
                >
                  <FiCopy size={16} /> Copy Link
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 900px) {
          .dashboard-stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .dashboard-body-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .dashboard-stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
};
export default Dashboard;
