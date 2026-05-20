import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { FiMail, FiMapPin, FiBriefcase, FiUsers, FiAward, FiEdit3, FiMessageSquare, FiHeart, FiSend, FiBookmark, FiTrash2, FiShare2 } from 'react-icons/fi';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileData {
  _id: string;
  name: string;
  role: string;
  email: string;
  profile: {
    avatar: string;
    cover: string;
    bio: string;
    skills: string[];
    department: string;
    batch: string;
    company: string;
    jobTitle: string;
  };
  connections: string[];
}

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
  likes: string[];
  comments: Comment[];
  sharesCount: number;
  createdAt: string;
}

export const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token, isMockMode } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchProfile = async () => {
    if (!id) return;
    if (isMockMode) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      if (mockUsersStr) {
        const list = JSON.parse(mockUsersStr) as ProfileData[];
        const found = list.find(u => u._id === id);
        
        // If current logged-in user matches id
        if (id === user?.id) {
          const currStr = localStorage.getItem('mock_db_current_user');
          if (currStr) {
            setProfile(JSON.parse(currStr));
          }
        } else if (found) {
          setProfile(found);
        }
      }
      setLoading(false);
    } else {
      try {
        const res = await axios.get(`${API_URL}/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchUserPosts = async () => {
    if (!id) return;
    setPostsLoading(true);
    if (isMockMode) {
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const allPosts = JSON.parse(mockPostsStr) as Post[];
        const userPosts = allPosts.filter(p => p.author._id === id || (p.author as any).id === id);
        setPosts(userPosts);
      }
      setPostsLoading(false);
    } else {
      try {
        const res = await axios.get(`${API_URL}/posts/user/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(res.data);
      } catch (err) {
        console.error('Error fetching user posts:', err);
      } finally {
        setPostsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, [id, isMockMode, user]);

  const handleLike = async (postId: string) => {
    if (!user) return;
    const userId = user.id || (user as any)._id;
    if (isMockMode) {
      const updated = posts.map(p => {
        if (p._id === postId) {
          const liked = p.likes.includes(userId);
          const newLikes = liked ? p.likes.filter(id => id !== userId) : [...p.likes, userId];
          return { ...p, likes: newLikes };
        }
        return p;
      });
      setPosts(updated);
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const all = JSON.parse(mockPostsStr) as Post[];
        const updatedAll = all.map(p => {
          if (p._id === postId) {
            const liked = p.likes.includes(userId);
            const newLikes = liked ? p.likes.filter(id => id !== userId) : [...p.likes, userId];
            return { ...p, likes: newLikes };
          }
          return p;
        });
        localStorage.setItem('mock_db_posts', JSON.stringify(updatedAll));
      }
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/like/${postId}`);
        setPosts(prev => prev.map(p => p._id === postId ? res.data : p));
      } catch (err) {
        console.error('Error liking post:', err);
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
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const all = JSON.parse(mockPostsStr) as Post[];
        const updatedAll = all.map(p => {
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
        localStorage.setItem('mock_db_posts', JSON.stringify(updatedAll));
      }
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
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const all = JSON.parse(mockPostsStr) as Post[];
        const updatedAll = all.map(p => {
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
        localStorage.setItem('mock_db_posts', JSON.stringify(updatedAll));
      }
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
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const all = JSON.parse(mockPostsStr) as Post[];
        const updatedAll = all.map(p => {
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
        localStorage.setItem('mock_db_posts', JSON.stringify(updatedAll));
      }
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
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const all = JSON.parse(mockPostsStr) as Post[];
        const updatedAll = all.filter(p => p._id !== postId);
        localStorage.setItem('mock_db_posts', JSON.stringify(updatedAll));
      }
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

  const handleShare = async (postId: string) => {
    if (isMockMode) {
      const updated = posts.map(p => {
        if (p._id === postId) {
          return { ...p, sharesCount: p.sharesCount + 1 };
        }
        return p;
      });
      setPosts(updated);
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const all = JSON.parse(mockPostsStr) as Post[];
        const updatedAll = all.map(p => {
          if (p._id === postId) {
            return { ...p, sharesCount: p.sharesCount + 1 };
          }
          return p;
        });
        localStorage.setItem('mock_db_posts', JSON.stringify(updatedAll));
      }
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

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, [id, isMockMode, user]);

  const handleStartChat = () => {
    if (!profile) return;
    navigate(`/dashboard/chat?active=${profile._id}`);
  };

  const handleEditRedirect = () => {
    navigate('/dashboard/settings');
  };

  if (loading) {
    return <div style={{ color: 'var(--color-text-gray)', fontSize: '14px' }}>Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Profile not found</h3>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile._id;

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      
      {/* Cover Photo */}
      <div 
        style={{
          height: '200px',
          borderRadius: '12px 12px 0 0',
          backgroundImage: `url(${profile.profile?.cover || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          border: '1px solid var(--color-border-glass)'
        }}
      >
        {/* Edit Cover Overlay if Own profile */}
        {isOwnProfile && (
          <button 
            onClick={handleEditRedirect}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid var(--color-border-glass)',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#ffffff',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FiEdit3 size={12} /> Edit cover
          </button>
        )}
      </div>

      {/* Profile summary card */}
      <div 
        className="glass-panel profile-brief-grid"
        style={{
          borderRadius: '0 0 12px 12px',
          padding: '24px 30px',
          marginTop: '-1px',
          borderColor: 'rgba(255, 215, 0, 0.08)',
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '150px 1fr',
          gap: '30px',
          alignItems: 'start'
        }}
      >
        
        {/* Avatar left column */}
        <div style={{ textAlign: 'center', marginTop: '-75px', position: 'relative', zIndex: 10 }}>
          <img
            src={profile.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
            alt={profile.name}
            style={{
              width: '130px',
              height: '130px',
              borderRadius: '50%',
              objectFit: 'cover',
              objectPosition: 'top center',
              border: '3px solid var(--color-yellow-primary)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              background: '#050505'
            }}
          />
        </div>

        {/* Text descriptions right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff' }}>
                {profile.name}
              </h2>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  background: 'var(--color-yellow-primary)',
                  color: '#000000',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>
                  {profile.role === 'student' ? 'scholar' : profile.role}
                </span>

                {profile.profile?.department && (
                  <span style={{ fontSize: '12px', color: 'var(--color-text-gray)' }}>
                    • {profile.profile.department}
                  </span>
                )}

                {profile.profile?.batch && (
                  <span style={{ fontSize: '12px', color: 'var(--color-text-gray)' }}>
                    • Batch {profile.profile.batch}
                  </span>
                )}
              </div>
            </div>

            {/* Actions CTA buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {isOwnProfile ? (
                <button className="btn-primary" onClick={handleEditRedirect} style={{ gap: '6px', padding: '8px 16px', fontSize: '13px' }}>
                  <FiEdit3 /> Edit Profile
                </button>
              ) : (
                <button className="btn-primary" onClick={handleStartChat} style={{ gap: '6px', padding: '8px 16px', fontSize: '13px' }}>
                  <FiMessageSquare /> Send Message
                </button>
              )}
            </div>
          </div>

          {/* Bio text */}
          <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', lineHeight: '1.6' }}>
            {profile.profile?.bio || 'No bio provided yet.'}
          </p>

          {/* Metadata detail badges */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            borderTop: '1px solid var(--color-border-glass)',
            paddingTop: '20px',
            fontSize: '13px'
          }} className="profile-meta-row">
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-gray)' }}>
              <FiBriefcase style={{ color: 'var(--color-yellow-primary)' }} />
              <div>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)' }}>Professional status</span>
                <span style={{ color: '#ffffff', fontWeight: 500 }}>
                  {profile.profile?.jobTitle ? `${profile.profile.jobTitle} at ` : ''}
                  {profile.profile?.company || (profile.role === 'student' ? 'Student Scholar' : 'Alumni Graduate')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-gray)' }}>
              <FiUsers style={{ color: 'var(--color-yellow-primary)' }} />
              <div>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)' }}>Connections count</span>
                <span style={{ color: '#ffffff', fontWeight: 500 }}>{profile.connections?.length || 0} Connections</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-gray)' }}>
              <FiMail style={{ color: 'var(--color-yellow-primary)' }} />
              <div>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)' }}>Email address</span>
                <span style={{ color: '#ffffff', fontWeight: 500, wordBreak: 'break-all' }}>{profile.email}</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Under splits (Skills & Activities) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '0.4fr 1.6fr',
        gap: '30px',
        marginTop: '30px',
        alignItems: 'start'
      }} className="profile-under-grid">
        
        {/* Skills sidebar card */}
        <div className="glass-panel" style={{ padding: '24px', borderColor: 'rgba(255,215,0,0.08)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiAward style={{ color: 'var(--color-yellow-primary)' }} /> Skills
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {profile.profile?.skills && profile.profile.skills.length > 0 ? (
              profile.profile.skills.map((sk, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '11px',
                    color: '#ffffff',
                    border: '1px solid var(--color-border-glass-hover)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '4px 10px',
                    borderRadius: '6px'
                  }}
                >
                  {sk}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>No skills listed.</span>
            )}
          </div>
        </div>

        {/* Profile activity list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)', margin: '0 0 4px 0' }}>
            Activity Feed
          </h3>
          {postsLoading ? (
            <div style={{ color: 'var(--color-text-gray)', fontSize: '14px' }}>Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
              No posts or updates shared yet by {profile.name}.
            </div>
          ) : (
            posts.map(post => {
              const isLiked = user ? post.likes.includes(user.id) || post.likes.includes((user as any)._id) : false;
              const authorMeta = post.author.role === 'alumni' ? 'Alumni' : 'Student';
              const companyMeta = post.author.profile?.company ? ` - ${post.author.profile.company}` : '';
              const batchMeta = post.author.profile?.batch ? ` • Batch ${post.author.profile.batch}` : '';
              
              return (
                <div key={post._id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', borderColor: 'rgba(255, 215, 0, 0.08)' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <img
                        src={post.author.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={post.author.name}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-yellow-primary)' }}
                      />
                      <div>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                          {post.author.name}
                        </h4>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-gray)' }}>
                          {authorMeta}{companyMeta}{batchMeta}
                        </span>
                      </div>
                    </div>
                    
                    {/* Delete action if allowed */}
                    {(user?.role === 'admin' || user?.id === post.author._id) && (
                      <button
                        onClick={() => handleDeletePost(post._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-muted)',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ff4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                      >
                        <FiTrash2 size={15} />
                      </button>
                    )}
                  </div>

                  <p style={{ fontSize: '13.5px', color: '#e0e0e0', lineHeight: '1.5', margin: 0 }}>
                    {post.caption}
                  </p>

                  {post.image && (
                    <div style={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      maxHeight: '280px',
                      border: '1px solid var(--color-border-glass)',
                      background: '#000000'
                    }}>
                      {post.image.startsWith('data:video/') || post.image.match(/\.(mp4|webm|ogg|mov)($|\?)/i) ? (
                        <video
                          src={post.image}
                          controls
                          style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block' }}
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

                  {/* Actions counts */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                    borderBottom: '1px solid var(--color-border-glass)',
                    paddingBottom: '8px'
                  }}>
                    <span>{post.likes.length} Likes</span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <span>{post.comments.length} Comments</span>
                      <span>{post.sharesCount} Reposts</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '2px 4px'
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
                        fontSize: '12.5px',
                        fontWeight: 500
                      }}
                    >
                      <FiHeart fill={isLiked ? 'var(--color-yellow-primary)' : 'none'} size={16} />
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
                        fontSize: '12.5px',
                        fontWeight: 500
                      }}
                    >
                      <FiMessageSquare size={16} />
                      <span>Comment</span>
                    </button>

                    <button
                      onClick={() => handleShare(post._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-gray)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12.5px',
                        fontWeight: 500
                      }}
                    >
                      <FiShare2 size={16} />
                      <span>Repost</span>
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
                          paddingTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '240px', overflowY: 'auto', paddingRight: '2px' }}>
                          {post.comments.map((comment, index) => {
                            const commentLikes = comment.likes || [];
                            const commentReplies = comment.replies || [];
                            const isCommentLiked = user ? commentLikes.includes(user.id) || commentLikes.includes((user as any)._id) : false;
                            
                            return (
                              <div key={comment._id || index} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px' }}>
                                  <Link to={`/dashboard/profile/${comment.user?._id || (comment.user as any)?.id}`}>
                                    <img
                                      src={comment.user?.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                                      alt={comment.user?.name}
                                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,215,0,0.15)' }}
                                    />
                                  </Link>
                                  <div style={{ flex: 1 }}>
                                    <div style={{
                                      background: 'rgba(255,255,255,0.03)',
                                      padding: '6px 10px',
                                      borderRadius: '10px',
                                      border: '1px solid rgba(255,255,255,0.02)'
                                    }}>
                                      <Link to={`/dashboard/profile/${comment.user?._id || (comment.user as any)?.id}`} style={{ textDecoration: 'none' }}>
                                        <h5 style={{ fontWeight: 700, color: 'var(--color-yellow-primary)', display: 'inline', marginRight: '6px', margin: 0 }}>{comment.user?.name}</h5>
                                      </Link>
                                      <p style={{ color: '#e0e0e0', marginTop: '2px', display: 'inline', margin: 0 }}>{comment.text}</p>
                                    </div>
                                    
                                    {/* Action row (Like, Reply, stats) */}
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px', paddingLeft: '2px' }}>
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
                                          <FiHeart fill="var(--color-yellow-primary)" size={9} style={{ color: 'var(--color-yellow-primary)' }} />
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
                                      padding: '4px 2px 0 2px'
                                    }}
                                  >
                                    <FiHeart fill={isCommentLiked ? 'var(--color-yellow-primary)' : 'none'} size={11} />
                                  </button>
                                </div>

                                {/* Render Replies */}
                                {commentReplies.length > 0 && (
                                  <div style={{ paddingLeft: '36px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                                    {commentReplies.map((reply, rIdx) => (
                                      <div key={reply._id || rIdx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '11.5px' }}>
                                        <Link to={`/dashboard/profile/${reply.user?._id || (reply.user as any)?.id}`}>
                                          <img
                                            src={reply.user?.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                                            alt={reply.user?.name}
                                            style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                                          />
                                        </Link>
                                        <div style={{ flex: 1 }}>
                                          <div style={{
                                            background: 'rgba(255,255,255,0.015)',
                                            padding: '4px 8px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.01)'
                                          }}>
                                            <Link to={`/dashboard/profile/${reply.user?._id || (reply.user as any)?.id}`} style={{ textDecoration: 'none' }}>
                                              <h6 style={{ fontWeight: 700, color: 'var(--color-yellow-primary)', display: 'inline', marginRight: '6px', margin: 0 }}>{reply.user?.name}</h6>
                                            </Link>
                                            <p style={{ color: '#d0d0d0', margin: 0, display: 'inline' }}>{reply.text}</p>
                                          </div>
                                          <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '2px', paddingLeft: '2px' }}>
                                            {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Just now'}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Local Nested Reply Input Form */}
                                {activeReplyCommentId === comment._id && (
                                  <div style={{ paddingLeft: '36px', display: 'flex', gap: '6px', marginTop: '2px' }}>
                                    <input
                                      type="text"
                                      placeholder={`Reply...`}
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      style={{
                                        flex: 1,
                                        background: 'rgba(10,10,10,0.8)',
                                        border: '1px solid var(--color-border-glass)',
                                        borderRadius: '6px',
                                        padding: '4px 8px',
                                        color: '#ffffff',
                                        fontSize: '11.5px',
                                        outline: 'none'
                                      }}
                                    />
                                    <button
                                      onClick={() => handleReplySubmit(post._id, comment._id)}
                                      style={{
                                        background: 'var(--color-yellow-primary)',
                                        color: '#000000',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '0 10px',
                                        fontSize: '10.5px',
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

                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
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
                              padding: '6px 10px',
                              color: '#ffffff',
                              fontSize: '12.5px',
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
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <FiSend size={13} />
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

      <style>{`
        @media (max-width: 768px) {
          .profile-brief-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .profile-brief-grid > div:first-child {
            margin-top: -60px !important;
            margin-bottom: 10px !important;
          }
          .profile-brief-grid > div:last-child {
            align-items: center !important;
          }
          .profile-meta-row {
            grid-template-columns: 1fr !important;
            text-align: left;
          }
          .profile-under-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
};
export default Profile;
