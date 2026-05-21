import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { FiUsers, FiPlus, FiHeart, FiMessageSquare, FiSend, FiBookmark, FiTrash2, FiShare2, FiCopy, FiLinkedin, FiTwitter, FiX, FiSearch, FiEdit3, FiCheck } from 'react-icons/fi';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfilePopup } from '../components/UserProfilePopup';

interface Reply {
  _id: string;
  user: {
    _id: string;
    name: string;
    profile: {
      avatar: string;
    };
  };
  text: string;
  createdAt: string;
}

interface Comment {
  _id: string;
  user: {
    _id: string;
    name: string;
    profile: {
      avatar: string;
    };
  };
  text: string;
  likes: string[];
  replies: Reply[];
  createdAt: string;
}

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
  likes: any[];
  comments: Comment[];
  sharesCount: number;
  createdAt: string;
}

export const Feed = () => {
  const { user, token, isMockMode, toggleSavePost } = useAuth();
  const { showNotification } = useNotification();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // New Post Form
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showPostConfirm, setShowPostConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);

  // Search & Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'my' | 'alumni' | 'student' | 'opportunities'>('all');

  // Edit / Delete / Preview details states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [selectedPreviewUserId, setSelectedPreviewUserId] = useState<string | null>(null);

  // React useEffect Scroll Lock
  useEffect(() => {
    const isAnyModalOpen = isPostModalOpen || showPostConfirm || showSuccessModal || (sharingPost !== null) || (postToDelete !== null) || (selectedPreviewUserId !== null);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPostModalOpen, showPostConfirm, showSuccessModal, sharingPost, postToDelete, selectedPreviewUserId]);

  // Comments
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchFeed = async () => {
    if (isMockMode) {
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        setPosts(JSON.parse(mockPostsStr));
      } else {
        const defaultMockPosts = [
          {
            _id: 'post_seed_1',
            author: {
              _id: 'alumni_priya',
              name: 'Priya Sharma',
              role: 'alumni',
              profile: {
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
                batch: '2016-2020',
                company: 'Microsoft'
              }
            },
            caption: 'Excited to share that I have been promoted to Senior Software Engineer at Microsoft! Extremely grateful to the Maatram Foundation for their invaluable support during my college years. Looking forward to mentoring the next batch of scholars.',
            image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
            likes: ['user_mock_1', 'user_mock_2'],
            comments: [
              {
                _id: 'c_seed_1',
                user: {
                  _id: 'student_aravind',
                  name: 'Aravind Kumar',
                  profile: { avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }
                },
                text: 'Inspirational achievement! Congratulations Priya!',
                likes: [],
                replies: [],
                createdAt: new Date(Date.now() - 3600000).toISOString()
              }
            ],
            sharesCount: 3,
            createdAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            _id: 'post_seed_2',
            author: {
              _id: 'alumni_arun',
              name: 'Arun Kumar',
              role: 'alumni',
              profile: {
                avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
                batch: '2018-2022',
                company: 'Zoho'
              }
            },
            caption: 'Delighted to start my journey as a Product Designer at Zoho. I will be conducting a virtual portfolio review and design workshop for Maatram scholars next Sunday. Stay tuned for details!',
            image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600',
            likes: ['user_mock_3'],
            comments: [],
            sharesCount: 1,
            createdAt: new Date(Date.now() - 172800000).toISOString()
          }
        ];
        localStorage.setItem('mock_db_posts', JSON.stringify(defaultMockPosts));
        setPosts(defaultMockPosts);
      }
      setLoading(false);
    } else {
      try {
        const res = await axios.get(`${API_URL}/posts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(res.data);
      } catch (err) {
        console.error('Error fetching feed:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [isMockMode]);

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
        console.error('Error liking:', err);
      }
    }
  };

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

  const handleClosePostModal = () => {
    setIsPostModalOpen(false);
    setEditingPostId(null);
    setCaption('');
    setMediaPreview('');
    setMediaFile(null);
  };

  const handleEditClick = (post: Post) => {
    setEditingPostId(post._id);
    setCaption(post.caption);
    setMediaPreview(post.image || '');
    setIsPostModalOpen(true);
  };

  const submitPost = async () => {
    setShowPostConfirm(false);
    
    if (isMockMode) {
      if (editingPostId) {
        const updated = posts.map(p => {
          if (p._id === editingPostId) {
            return {
              ...p,
              caption,
              image: mediaPreview || ''
            };
          }
          return p;
        });
        setPosts(updated);
        localStorage.setItem('mock_db_posts', JSON.stringify(updated));
        setCaption('');
        setMediaFile(null);
        setMediaPreview('');
        setEditingPostId(null);
        setIsPostModalOpen(false);
        showNotification('Post Updated', 'Your post has been successfully updated.', 'success');
      } else {
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
        setShowSuccessModal(true);
      }
    } else {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        if (editingPostId) {
          const res = await axios.put(
            `${API_URL}/posts/${editingPostId}`,
            { caption, image: mediaPreview },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          setPosts(prev => prev.map(p => p._id === editingPostId ? res.data : p));
          setCaption('');
          setMediaFile(null);
          setMediaPreview('');
          setEditingPostId(null);
          setIsPostModalOpen(false);
          showNotification('Post Updated', 'Your post has been successfully updated.', 'success');
        } else {
          const res = await axios.post(
            `${API_URL}/posts`,
            { caption, image: mediaPreview },
            {
              headers: { Authorization: `Bearer ${token}` },
              onUploadProgress: (progressEvent) => {
                const total = progressEvent.total || (progressEvent as any).bytesTotal || 0;
                if (total > 0) {
                  const current = progressEvent.loaded;
                  const percent = Math.round((current * 100) / total);
                  setUploadProgress(percent);
                }
              }
            }
          );
          setPosts(prev => [res.data, ...prev]);
          setCaption('');
          setMediaFile(null);
          setMediaPreview('');
          setIsPostModalOpen(false);
          setShowSuccessModal(true);
        }
      } catch (err: any) {
        console.error('Failed to save post:', err);
        const errMsg = err.response?.data?.message || err.message || 'Failed to save post';
        showNotification('Error', errMsg, 'error');
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    if (!commentText.trim()) return;

    if (isMockMode) {
      const updated = posts.map(p => {
        if (p._id === postId) {
          const newComment: Comment = {
            _id: 'c_' + Date.now(),
            user: {
              _id: user?.id || '',
              name: user?.name || '',
              profile: { avatar: user?.profile?.avatar || '' }
            },
            text: commentText,
            likes: [],
            replies: [],
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

  const handleCommentLike = async (postId: string, commentId: string) => {
    if (!user) return;
    const userId = user.id || (user as any)._id;
    if (isMockMode) {
      const updated = posts.map(p => {
        if (p._id === postId) {
          const updatedComments = p.comments.map(c => {
            if (c._id === commentId) {
              const likesList = c.likes || [];
              const liked = likesList.includes(userId);
              const newLikes = liked ? likesList.filter(id => id !== userId) : [...likesList, userId];
              return { ...c, likes: newLikes };
            }
            return c;
          });
          return { ...p, comments: updatedComments };
        }
        return p;
      });
      setPosts(updated);
      localStorage.setItem('mock_db_posts', JSON.stringify(updated));
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/comment/${postId}/${commentId}/like`);
        setPosts(prev => prev.map(p => p._id === postId ? res.data : p));
      } catch (err) {
        console.error('Error liking comment:', err);
      }
    }
  };

  const handleReplySubmit = async (postId: string, commentId: string) => {
    if (!replyText.trim() || !user) return;
    const userId = user.id || (user as any)._id;
    if (isMockMode) {
      const updated = posts.map(p => {
        if (p._id === postId) {
          const updatedComments = p.comments.map(c => {
            if (c._id === commentId) {
              const newReply: Reply = {
                _id: 'r_' + Date.now(),
                user: {
                  _id: userId,
                  name: user.name,
                  profile: { avatar: user.profile?.avatar || '' }
                },
                text: replyText,
                createdAt: new Date().toISOString()
              };
              return { ...c, replies: [...(c.replies || []), newReply] };
            }
            return c;
          });
          return { ...p, comments: updatedComments };
        }
        return p;
      });
      setPosts(updated);
      localStorage.setItem('mock_db_posts', JSON.stringify(updated));
      setReplyText('');
      setActiveReplyCommentId(null);
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/comment/${postId}/${commentId}/reply`, { text: replyText });
        setPosts(prev => prev.map(p => p._id === postId ? res.data : p));
        setReplyText('');
        setActiveReplyCommentId(null);
      } catch (err) {
        console.error('Error replying to comment:', err);
      }
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (isMockMode) {
      const updated = posts.filter(p => p._id !== postId);
      setPosts(updated);
      localStorage.setItem('mock_db_posts', JSON.stringify(updated));
      showNotification('Success', 'Post deleted successfully', 'success');
    } else {
      try {
        await axios.delete(`${API_URL}/posts/${postId}`);
        setPosts(prev => prev.filter(p => p._id !== postId));
        showNotification('Success', 'Post deleted successfully', 'success');
      } catch (err) {
        console.error('Error deleting:', err);
      }
    }
  };

  // Real-time search and filter algorithm
  const filteredPosts = posts.filter(post => {
    // 1. Search Query filter
    const matchesSearch = 
      post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.author.profile?.company && post.author.profile.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (post.author.profile?.batch && post.author.profile.batch.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // 2. Active Filter Tab
    const currentUserId = user?.id || (user as any)?._id;
    if (activeFilter === 'my') {
      return post.author._id === currentUserId || (post.author as any).id === currentUserId;
    }
    if (activeFilter === 'alumni') {
      return post.author.role === 'alumni';
    }
    if (activeFilter === 'student') {
      return post.author.role === 'student';
    }
    if (activeFilter === 'opportunities') {
      const keywords = ['hiring', 'job', 'intern', 'career', 'webinar', 'opportunity', 'referral', 'recruiting', 'opening', 'mentor', 'session'];
      return keywords.some(kw => post.caption.toLowerCase().includes(kw));
    }

    return true;
  });

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

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 850, fontFamily: 'var(--font-title)' }}>
            Community Feed
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-gray)' }}>
            Share your achievements, mentorship offerings, and professional posts.
          </p>
        </div>
        
        <button className="btn-primary" onClick={() => {
          setEditingPostId(null);
          setCaption('');
          setMediaPreview('');
          setMediaFile(null);
          setIsPostModalOpen(true);
        }}>
          <FiPlus size={18} /> Share Update
        </button>
      </div>

      {/* Grid container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '0.7fr 1.3fr',
        gap: '30px',
        alignItems: 'start'
      }} className="feed-grid-layout">
        
        {/* Left column: profile brief & bookmarks preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* User brief profile card */}
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', borderColor: 'rgba(255, 215, 0, 0.08)' }}>
            <img
              src={user?.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={user?.name}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--color-yellow-primary)',
                margin: '0 auto 12px auto'
              }}
            />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{user?.name}</h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-gray)', textTransform: 'capitalize' }}>
              {user?.role} {user?.profile?.department ? `• ${user.profile.department}` : ''}
            </span>
            
            <div style={{
              marginTop: '16px',
              borderTop: '1px solid var(--color-border-glass)',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'space-around',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Connections</span>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>{user?.connections?.length || 0}</span>
              </div>
              <div style={{ borderLeft: '1px solid var(--color-border-glass)' }} />
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Saved Posts</span>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>{user?.savedPosts?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Quick tips brief card */}
          <div className="glass-panel" style={{ padding: '20px', borderColor: 'rgba(255, 215, 0, 0.08)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-yellow-primary)', marginBottom: '10px' }}>
              Community Standards
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: 'var(--color-text-gray)' }}>
              <li>• Share posts regarding scholarship guidance</li>
              <li>• Refrain from spamming or posting commercial advertisements</li>
              <li>• Always be respectful to scholars and alumni</li>
            </ul>
          </div>
        </div>

        {/* Right column: Main Feed stream list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Search bar & Filter tabs */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', borderColor: 'rgba(255, 215, 0, 0.1)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(5,5,5,0.7)', border: '1px solid var(--color-border-glass)', borderRadius: '8px', padding: '8px 14px' }}>
              <FiSearch style={{ color: 'var(--color-yellow-primary)' }} size={18} />
              <input
                type="text"
                placeholder="Search posts by keyword, author, role, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  outline: 'none',
                  width: '100%',
                  fontSize: '13.5px'
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--color-text-gray)', cursor: 'pointer' }}>
                  <FiX size={16} />
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
              {[
                { id: 'all', label: 'All Updates' },
                { id: 'my', label: 'My Posts' },
                { id: 'alumni', label: 'Alumni Updates' },
                { id: 'student', label: 'Scholar Posts' },
                { id: 'opportunities', label: 'Opportunities' }
              ].map(pill => {
                const isActive = activeFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setActiveFilter(pill.id as any)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: isActive ? '1px solid var(--color-yellow-primary)' : '1px solid rgba(255,255,255,0.1)',
                      background: isActive ? 'var(--color-yellow-primary)' : 'rgba(255,255,255,0.02)',
                      color: isActive ? '#000000' : 'var(--color-text-gray)',
                      cursor: 'pointer',
                      fontWeight: isActive ? 600 : 500,
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 0 10px rgba(255,215,0,0.15)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'var(--color-text-gray)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                      }
                    }}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div style={{ color: 'var(--color-text-gray)', fontSize: '14px' }}>Loading feed...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="glass-panel" style={{ padding: '35px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
              {searchQuery || activeFilter !== 'all' ? 'No matches found. Try modifying your search or filters.' : 'No posts found. Be the first to share an update!'}
            </div>
          ) : (
            filteredPosts.map(post => {
              const isLiked = user ? post.likes.includes(user.id) || post.likes.includes((user as any)._id) : false;
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div 
                      style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setSelectedPreviewUserId(post.author._id || (post.author as any).id)}
                    >
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
                        <h4 
                          style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-yellow-primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                        >
                          {post.author.name}
                        </h4>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-gray)' }}>
                          {authorMeta}{batchMeta}
                        </span>
                      </div>
                    </div>
                    
                    {/* Edit & Delete options if Admin or Creator */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {/* Edit Option (Creator only) */}
                      {(user?.id === post.author._id || (user as any)?._id === post.author._id) && (
                        <button
                          onClick={() => handleEditClick(post)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            transition: 'color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-yellow-primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                        >
                          <FiEdit3 size={15} />
                        </button>
                      )}
                      
                      {/* Delete Option (Creator or Admin) */}
                      {(user?.role === 'admin' || user?.id === post.author._id || (user as any)?._id === post.author._id) && (
                        <button
                          onClick={() => setPostToDelete(post._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            transition: 'color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ff4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '14px', color: '#e0e0e0', lineHeight: '1.6' }}>
                    {post.caption}
                  </p>

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

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
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
                        fontWeight: 500
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
                      onClick={() => toggleSavePost(post._id)}
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

                  {/* Comment Drawer expansion */}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                          {post.comments.map((comment, index) => {
                            const commentLikes = comment.likes || [];
                            const commentReplies = comment.replies || [];
                            const isCommentLiked = user ? commentLikes.includes(user.id) || commentLikes.includes((user as any)._id) : false;
                            
                            return (
                              <div key={comment._id || index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px' }}>
                                  <div 
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setSelectedPreviewUserId(comment.user?._id || (comment.user as any)?.id)}
                                  >
                                    <img
                                      src={comment.user?.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                                      alt={comment.user?.name}
                                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,215,0,0.15)' }}
                                    />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{
                                      background: 'rgba(255,255,255,0.03)',
                                      padding: '8px 12px',
                                      borderRadius: '12px',
                                      border: '1px solid rgba(255,255,255,0.02)'
                                    }}>
                                      <span 
                                        style={{ fontWeight: 700, color: 'var(--color-yellow-primary)', marginRight: '6px', cursor: 'pointer', fontSize: '13px' }}
                                        onClick={() => setSelectedPreviewUserId(comment.user?._id || (comment.user as any)?.id)}
                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                      >
                                        {comment.user?.name}
                                      </span>
                                      <p style={{ color: '#e0e0e0', marginTop: '2px', display: 'inline', margin: 0 }}>{comment.text}</p>
                                    </div>
                                    
                                    {/* Action row (Like, Reply, stats) */}
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '4px', paddingLeft: '4px' }}>
                                      <span>{comment.createdAt ? new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Just now'}</span>
                                      
                                      <button
                                        onClick={() => handleCommentLike(post._id, comment._id)}
                                        style={{ background: 'none', border: 'none', color: isCommentLiked ? 'var(--color-yellow-primary)' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                                      >
                                        {isCommentLiked ? 'Liked' : 'Like'}
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          setActiveReplyCommentId(activeReplyCommentId === comment._id ? null : comment._id);
                                          setReplyText('');
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                                      >
                                        Reply
                                      </button>
                                      
                                      {commentLikes.length > 0 && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                          <FiHeart fill="var(--color-yellow-primary)" size={10} style={{ color: 'var(--color-yellow-primary)' }} />
                                          {commentLikes.length}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Small Heart Icon on the far right */}
                                  <button
                                    onClick={() => handleCommentLike(post._id, comment._id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: isCommentLiked ? 'var(--color-yellow-primary)' : 'var(--color-text-muted)',
                                      cursor: 'pointer',
                                      padding: '6px 2px 0 2px'
                                    }}
                                  >
                                    <FiHeart fill={isCommentLiked ? 'var(--color-yellow-primary)' : 'none'} size={12} />
                                  </button>
                                </div>

                                {/* Render Replies */}
                                {commentReplies.length > 0 && (
                                  <div style={{ paddingLeft: '42px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                    {commentReplies.map((reply, rIdx) => (
                                      <div key={reply._id || rIdx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px' }}>
                                         <div 
                                           style={{ cursor: 'pointer' }}
                                           onClick={() => setSelectedPreviewUserId(reply.user?._id || (reply.user as any)?.id)}
                                         >
                                           <img
                                             src={reply.user?.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                                             alt={reply.user?.name}
                                             style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                                           />
                                         </div>
                                         <div style={{ flex: 1 }}>
                                           <div style={{
                                             background: 'rgba(255,255,255,0.015)',
                                             padding: '6px 10px',
                                             borderRadius: '10px',
                                             border: '1px solid rgba(255,255,255,0.01)'
                                           }}>
                                             <span 
                                               style={{ fontWeight: 700, color: 'var(--color-yellow-primary)', marginRight: '6px', cursor: 'pointer', fontSize: '12px' }}
                                               onClick={() => setSelectedPreviewUserId(reply.user?._id || (reply.user as any)?.id)}
                                               onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                               onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                             >
                                               {reply.user?.name}
                                             </span>
                                             <p style={{ color: '#d0d0d0', margin: 0, display: 'inline' }}>{reply.text}</p>
                                           </div>
                                          <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', marginTop: '2px', paddingLeft: '2px' }}>
                                            {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Just now'}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Local Nested Reply Input Form */}
                                {activeReplyCommentId === comment._id && (
                                  <div style={{ paddingLeft: '42px', display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    <input
                                      type="text"
                                      placeholder={`Reply to ${comment.user?.name}...`}
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      style={{
                                        flex: 1,
                                        background: 'rgba(10,10,10,0.8)',
                                        border: '1px solid var(--color-border-glass)',
                                        borderRadius: '8px',
                                        padding: '6px 10px',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        outline: 'none'
                                      }}
                                    />
                                    <button
                                      onClick={() => handleReplySubmit(post._id, comment._id)}
                                      style={{
                                        background: 'var(--color-yellow-primary)',
                                        color: '#000000',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '0 12px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Send
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

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
            })
          )}
        </div>

      </div>

      {/* Modal post creator */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="notification-overlay" style={{ zIndex: 10000 }} onClick={handleClosePostModal}>
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
                {editingPostId ? 'Edit Post' : 'Share an Update'}
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
                      onClick={() => document.getElementById('media-file-input')?.click()}
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
                        id="media-file-input"
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
                    onClick={handleClosePostModal}
                    className="btn-outline"
                    style={{ flex: 1, justifyItems: 'center', justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isUploading}
                    style={{ flex: 1, justifyItems: 'center', justifyContent: 'center' }}
                  >
                    {isUploading ? `Uploading ${uploadProgress || 0}%` : (editingPostId ? 'Save Changes' : 'Publish Post')}
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
          <div className="notification-overlay" style={{ zIndex: 10010, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)' }} onClick={() => setShowPostConfirm(false)}>
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

      {/* Post Creation Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="notification-overlay" style={{ zIndex: 10020, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(5px)' }} onClick={() => setShowSuccessModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel"
              style={{
                width: '90%',
                maxWidth: '400px',
                padding: '30px 24px',
                textAlign: 'center',
                border: '1px solid var(--color-yellow-primary)',
                boxShadow: '0 10px 40px rgba(255, 215, 0, 0.15)',
                background: 'rgba(10, 10, 10, 0.95)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(255, 215, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                color: 'var(--color-yellow-primary)',
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.2)'
              }}>
                <FiCheck size={32} />
              </div>
              
              <h3 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-title)', marginBottom: '12px', color: '#ffffff' }}>
                Post Published!
              </h3>
              
              <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', lineHeight: '1.6', marginBottom: '24px' }}>
                Your update has been successfully shared with the Maatram community feed.
              </p>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="btn-primary"
                style={{ width: '100%', justifyItems: 'center', justifyContent: 'center' }}
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Centered Glassmorphic External Share Dialog */}
      <AnimatePresence>
        {sharingPost && (
          <div 
            className="notification-overlay" 
            style={{ zIndex: 10020 }} 
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

      {/* Delete Post Confirmation Modal */}
      <AnimatePresence>
        {postToDelete && (
          <div className="notification-overlay" style={{ zIndex: 10015, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)' }} onClick={() => setPostToDelete(null)}>
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
                border: '1px solid #ff4444',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                background: 'rgba(10, 10, 10, 0.95)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-title)', marginBottom: '12px', color: '#ffffff' }}>
                Confirm Deletion
              </h3>
              
              <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', lineHeight: '1.5', marginBottom: '24px' }}>
                Are you sure you want to delete this post? This action cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setPostToDelete(null)}
                  className="btn-outline"
                  style={{ flex: 1, justifyItems: 'center', justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeletePost(postToDelete);
                    setPostToDelete(null);
                  }}
                  className="btn-primary"
                  style={{ flex: 1, justifyItems: 'center', justifyContent: 'center', background: '#ff4444', borderColor: '#ff4444', color: '#ffffff' }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Profile Preview Popup */}
      <AnimatePresence>
        {selectedPreviewUserId && (
          <UserProfilePopup 
            userId={selectedPreviewUserId} 
            onClose={() => setSelectedPreviewUserId(null)} 
          />
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 900px) {
          .feed-grid-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
};
export default Feed;
