import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth, API_URL, Experience, DEFAULT_AVATAR } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { FiMail, FiMapPin, FiBriefcase, FiUsers, FiAward, FiEdit3, FiMessageSquare, FiHeart, FiSend, FiBookmark, FiTrash2, FiShare2, FiPlus, FiX, FiLock, FiUserCheck, FiUserPlus, FiUser, FiBookOpen, FiThumbsUp, FiSmile, FiRepeat, FiCopy, FiLinkedin, FiTwitter } from 'react-icons/fi';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfilePopup } from '../components/UserProfilePopup';

interface ProfileData {
  _id: string;
  id?: string;
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
    gender?: string;
    education?: string;
    college?: string;
    experience?: Experience[];
  };
  connections: string[];
  isPrivate?: boolean;
  isPrivateMasked?: boolean;
  reposts?: string[];
}

interface Reply {
  _id: string;
  user: {
    _id: string;
    name: string;
    role?: string;
    profile: {
      avatar: string;
      company?: string;
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
    role?: string;
    profile: {
      avatar: string;
      company?: string;
    };
  };
  text: string;
  likes: string[];
  replies: Reply[];
  createdAt: string;
}

interface Reaction {
  user: {
    _id: string;
    name: string;
    profile: {
      avatar: string;
    };
  } | string;
  type: 'like' | 'funny' | 'celebrate';
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
  reactions?: Reaction[];
  comments: Comment[];
  sharesCount: number;
  createdAt: string;
}

export const Profile = () => {
  const useParamsData = useParams<{ id: string }>();
  const id = useParamsData.id;
  const { user, token, isMockMode, toggleConnect, refreshUser } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const checkIsLiked = (likes: any[]) => {
    if (!user || !likes) return false;
    const currentUserId = user.id || (user as any)._id;
    return likes.some(l => {
      if (typeof l === 'object' && l !== null) {
        const lId = l._id || l.id;
        return lId === currentUserId;
      }
      return l === currentUserId;
    });
  };

  const renderRoleBadge = (role?: string) => {
    if (!role) return null;
    let bg = 'rgba(255, 255, 255, 0.05)';
    let color = 'var(--color-text-gray)';
    let border = '1px solid rgba(255, 255, 255, 0.1)';
    let text = role;
    
    if (role === 'admin') {
      bg = 'rgba(255, 68, 68, 0.1)';
      color = '#ff6666';
      border = '1px solid rgba(255, 68, 68, 0.2)';
      text = 'Admin';
    } else if (role === 'alumni') {
      bg = 'rgba(255, 215, 0, 0.1)';
      color = 'var(--color-yellow-primary)';
      border = '1px solid rgba(255, 215, 0, 0.2)';
      text = 'Alumni';
    } else if (role === 'student') {
      bg = 'rgba(30, 144, 255, 0.1)';
      color = '#1e90ff';
      border = '1px solid rgba(30, 144, 255, 0.2)';
      text = 'Scholar';
    }
    
    return (
      <span style={{
        fontSize: '9px',
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: bg,
        color: color,
        border: border,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginLeft: '6px',
        verticalAlign: 'middle',
        display: 'inline-block'
      }}>
        {text}
      </span>
    );
  };

  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);

  const getUserReaction = (post: Post) => {
    if (!user) return null;
    const currentUserId = user.id || (user as any)._id;
    const found = post.reactions?.find(r => {
      const rUserId = typeof r.user === 'object' && r.user !== null ? ((r.user as any)._id || (r.user as any).id) : r.user;
      return rUserId === currentUserId;
    });
    if (found) return found.type;
    
    // Fallback to checkIsLiked
    const liked = post.likes?.some(l => {
      if (typeof l === 'object' && l !== null) {
        return (l._id || l.id) === currentUserId;
      }
      return l === currentUserId;
    });
    return liked ? 'like' : null;
  };

  const renderReactionIcon = (type: string | null) => {
    switch (type) {
      case 'like':
        return <FiThumbsUp size={18} style={{ display: 'inline-flex', alignItems: 'center' }} />;
      case 'funny':
        return <FiSmile size={18} style={{ display: 'inline-flex', alignItems: 'center' }} />;
      case 'celebrate':
        return <FiAward size={18} style={{ display: 'inline-flex', alignItems: 'center' }} />;
      default:
        return <FiThumbsUp size={18} style={{ display: 'inline-flex', alignItems: 'center' }} />;
    }
  };

  const getReactionLabel = (type: string | null) => {
    switch (type) {
      case 'like':
        return 'Like';
      case 'funny':
        return 'Funny';
      case 'celebrate':
        return 'Celebrate';
      default:
        return 'Like';
    }
  };

  const formatReactionsSummary = (post: Post) => {
    const reactionsList = post.reactions || [];
    
    const names: string[] = [];
    reactionsList.forEach(r => {
      if (typeof r.user === 'object' && r.user !== null && r.user.name) {
        names.push(r.user.name);
      }
    });

    if (names.length === 0 && post.likes && post.likes.length > 0) {
      post.likes.forEach(l => {
        if (typeof l === 'object' && l !== null && l.name) {
          names.push(l.name);
        }
      });
    }

    const totalCount = Math.max(reactionsList.length, post.likes ? post.likes.length : 0);

    if (totalCount === 0) {
      return '0 Likes';
    }

    const uniqueNames = Array.from(new Set(names));

    if (totalCount === 1) {
      const name = uniqueNames[0] || 'Someone';
      return `${name} reacted`;
    }

    if (totalCount === 2) {
      const name1 = uniqueNames[0] || 'Someone';
      const name2 = uniqueNames[1] || 'Someone else';
      return `${name1} and ${name2} reacted`;
    }

    const name1 = uniqueNames[0] || 'Someone';
    const name2 = uniqueNames[1] || 'Someone else';
    const othersCount = totalCount - 2;
    return `${name1}, ${name2} and ${othersCount} ${othersCount === 1 ? 'other' : 'others'} reacted`;
  };

  const renderReactionsSummaryIcons = (post: Post) => {
    const reactionsList = post.reactions || [];
    if (reactionsList.length === 0) {
      if (post.likes && post.likes.length > 0) {
        return <FiThumbsUp size={12} style={{ color: 'var(--color-yellow-primary)', marginRight: '6px', verticalAlign: 'middle' }} />;
      }
      return null;
    }
    const uniqueTypes = Array.from(new Set(reactionsList.map(r => r.type)));
    return (
      <span style={{ display: 'inline-flex', gap: '4px', marginRight: '6px', alignItems: 'center', verticalAlign: 'middle' }}>
        {uniqueTypes.map(t => {
          if (t === 'like') return <FiThumbsUp key={t} size={12} style={{ color: 'var(--color-yellow-primary)' }} />;
          if (t === 'funny') return <FiSmile key={t} size={12} style={{ color: 'var(--color-yellow-primary)' }} />;
          if (t === 'celebrate') return <FiAward key={t} size={12} style={{ color: 'var(--color-yellow-primary)' }} />;
          return null;
        })}
      </span>
    );
  };

  // Helper to retrieve detailed likers for popover
  const getLikesUsers = (post: Post) => {
    if (!post || !post.likes) return [];
    if (post.likes.length > 0 && typeof post.likes[0] === 'object') {
      return post.likes as any[];
    }
    if (isMockMode) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      const mockCurrentUserStr = localStorage.getItem('mock_db_current_user');
      const allUsers: any[] = [];
      if (mockUsersStr) allUsers.push(...JSON.parse(mockUsersStr));
      if (mockCurrentUserStr) allUsers.push(JSON.parse(mockCurrentUserStr));
      
      return post.likes.map(id => {
        const found = allUsers.find(u => u._id === id || u.id === id);
        if (found) {
          return {
            _id: found._id || found.id,
            name: found.name,
            role: found.role,
            profile: found.profile
          };
        }
        return { _id: id, name: 'User', role: '', profile: { avatar: '' } };
      });
    }
    return post.likes.map(id => ({ _id: id, name: 'User', role: '', profile: { avatar: '' } }));
  };

  const handleReact = async (postId: string, type: 'like' | 'funny' | 'celebrate') => {
    if (!user) return;
    const userId = user.id || (user as any)._id;
    const userName = user.name;
    const userAvatar = user.profile?.avatar || '';

    if (isMockMode) {
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      const all = mockPostsStr ? (JSON.parse(mockPostsStr) as Post[]) : [];
      
      const updatePostObject = (p: Post): Post => {
        if (p._id !== postId) return p;
        
        const reactions = p.reactions ? [...p.reactions] : [];
        const reactIdx = reactions.findIndex(r => {
          const rUserId = typeof r.user === 'object' && r.user !== null ? ((r.user as any)._id || (r.user as any).id) : r.user;
          return rUserId === userId;
        });
        
        const likeIdx = p.likes.findIndex(l => {
          const lId = typeof l === 'object' && l !== null ? (l._id || l.id) : l;
          return lId === userId;
        });
        
        let updatedLikes = [...p.likes];
        
        if (reactIdx > -1) {
          if (reactions[reactIdx].type === type) {
            // Toggle off
            reactions.splice(reactIdx, 1);
            if (likeIdx > -1) {
              updatedLikes.splice(likeIdx, 1);
            }
          } else {
            // Change type
            reactions[reactIdx] = {
              ...reactions[reactIdx],
              type,
              user: { _id: userId, name: userName, profile: { avatar: userAvatar } }
            };
            if (likeIdx === -1) {
              updatedLikes.push(userId);
            }
          }
        } else {
          // New reaction
          reactions.push({
            user: { _id: userId, name: userName, profile: { avatar: userAvatar } },
            type
          });
          if (likeIdx === -1) {
            updatedLikes.push(userId);
          }
        }
        
        return { ...p, reactions, likes: updatedLikes };
      };

      const updatedPosts = posts.map(updatePostObject);
      setPosts(updatedPosts);
      const updatedReposts = reposts.map(updatePostObject);
      setReposts(updatedReposts);
      
      const updatedAllPosts = all.map(updatePostObject);
      localStorage.setItem('mock_db_posts', JSON.stringify(updatedAllPosts));
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/react/${postId}`, { type }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(prev => prev.map(p => p._id === postId ? res.data : p));
        setReposts(prev => prev.map(p => p._id === postId ? res.data : p));
      } catch (err) {
        console.error('Error reacting to post:', err);
      }
    }
  };

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [reposts, setReposts] = useState<Post[]>([]);
  const [repostsLoading, setRepostsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts'>('posts');
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sharingPost, setSharingPost] = useState<Post | null>(null);

  // Modal create/edit post states
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [showPostConfirm, setShowPostConfirm] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Delete & Preview states
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [selectedPreviewUserId, setSelectedPreviewUserId] = useState<string | null>(null);
  const [showWhoLikedPostId, setShowWhoLikedPostId] = useState<string | null>(null);
  const [activePostOptions, setActivePostOptions] = useState<Post | null>(null);

  // React useEffect Scroll Lock
  useEffect(() => {
    const isAnyModalOpen = isPostModalOpen || showPostConfirm || (postToDelete !== null) || (selectedPreviewUserId !== null) || (showWhoLikedPostId !== null) || (sharingPost !== null) || (activePostOptions !== null);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPostModalOpen, showPostConfirm, postToDelete, selectedPreviewUserId, showWhoLikedPostId, sharingPost, activePostOptions]);

  const handlePostCardClick = (e: React.MouseEvent, post: Post) => {
    const target = e.target as HTMLElement;
    let current: HTMLElement | null = target;
    for (let i = 0; i < 5; i++) {
      if (!current) break;
      const tagName = current.tagName.toLowerCase();
      if (
        tagName === 'button' ||
        tagName === 'a' ||
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'video' ||
        tagName === 'audio' ||
        tagName === 'img' ||
        current.onclick ||
        current.getAttribute('role') === 'button' ||
        current.style.cursor === 'pointer'
      ) {
        return;
      }
      current = current.parentElement;
    }
    setActivePostOptions(post);
  };

  const handlePostCardContextMenu = (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    handleLike(postId);
    showNotification('Liked!', 'Post like toggled.', 'success');
  };

  const fetchProfile = async () => {
    if (!id) return;
    if (isMockMode) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      if (mockUsersStr) {
        const list = JSON.parse(mockUsersStr) as any[];
        const found = list.find(u => u._id === id || u.id === id);
        
        if (found) {
          // Normalize found user
          const normalizedUser: ProfileData = {
            ...found,
            _id: found._id || found.id,
            connections: found.connections || []
          };
          
          const isOwner = normalizedUser._id === user?.id || normalizedUser.id === user?.id || normalizedUser._id === user?._id || normalizedUser.id === user?._id;
          const isAdmin = user?.role === 'admin';
          const isConnected = normalizedUser.connections.includes(user?.id || '') || normalizedUser.connections.includes(user?._id || '');
          
          if (found.isPrivate && !isOwner && !isAdmin && !isConnected) {
            normalizedUser.email = '••••••••@••••.•••';
            normalizedUser.profile = {
              avatar: found.profile?.avatar || '',
              cover: found.profile?.cover || '',
              bio: 'This account is private.',
              skills: [],
              department: 'Private',
              batch: 'Private',
              company: 'Private',
              jobTitle: 'Private'
            };
            normalizedUser.isPrivateMasked = true;
          }
          setProfile(normalizedUser);
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
      // Find user to check privacy
      const mockUsersStr = localStorage.getItem('mock_db_users');
      let isPrivateMasked = false;
      if (mockUsersStr) {
        const list = JSON.parse(mockUsersStr) as any[];
        const found = list.find(u => u._id === id || u.id === id);
        if (found) {
          const isOwner = (found._id || found.id) === user?.id;
          const isAdmin = user?.role === 'admin';
          const connections = found.connections || [];
          const isConnected = connections.includes(user?.id || '');
          if (found.isPrivate && !isOwner && !isAdmin && !isConnected) {
            isPrivateMasked = true;
          }
        }
      }

      if (isPrivateMasked) {
        setPosts([]);
      } else {
        const mockPostsStr = localStorage.getItem('mock_db_posts');
        if (mockPostsStr) {
          const allPosts = JSON.parse(mockPostsStr) as Post[];
          const userPosts = allPosts.filter(p => p.author._id === id || (p.author as any).id === id);
          setPosts(userPosts);
        }
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
    fetchUserReposts();
  }, [id, isMockMode, user]);

  const handleLike = async (postId: string) => {
    await handleReact(postId, 'like');
  };

  const handleCommentSubmit = async (postId: string) => {
    if (!commentText.trim()) return;
    if (isMockMode) {
      const updatePostWithComment = (p: Post): Post => {
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
      };

      const updated = posts.map(updatePostWithComment);
      setPosts(updated);
      const updatedReposts = reposts.map(updatePostWithComment);
      setReposts(updatedReposts);

      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const all = JSON.parse(mockPostsStr) as Post[];
        const updatedAll = all.map(updatePostWithComment);
        localStorage.setItem('mock_db_posts', JSON.stringify(updatedAll));
      }
      setCommentText('');
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/comment/${postId}`, { text: commentText }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(prev => prev.map(p => p._id === postId ? res.data : p));
        setReposts(prev => prev.map(p => p._id === postId ? res.data : p));
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
      const updatePostCommentLike = (p: Post): Post => {
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
      };

      const updated = posts.map(updatePostCommentLike);
      setPosts(updated);
      const updatedReposts = reposts.map(updatePostCommentLike);
      setReposts(updatedReposts);

      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const all = JSON.parse(mockPostsStr) as Post[];
        const updatedAll = all.map(updatePostCommentLike);
        localStorage.setItem('mock_db_posts', JSON.stringify(updatedAll));
      }
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/comment/${postId}/${commentId}/like`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(prev => prev.map(p => p._id === postId ? res.data : p));
        setReposts(prev => prev.map(p => p._id === postId ? res.data : p));
      } catch (err) {
        console.error('Error liking comment:', err);
      }
    }
  };

  const handleReplySubmit = async (postId: string, commentId: string) => {
    if (!replyText.trim() || !user) return;
    const userId = user.id || (user as any)._id;
    if (isMockMode) {
      const updatePostCommentReply = (p: Post): Post => {
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
      };

      const updated = posts.map(updatePostCommentReply);
      setPosts(updated);
      const updatedReposts = reposts.map(updatePostCommentReply);
      setReposts(updatedReposts);

      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const all = JSON.parse(mockPostsStr) as Post[];
        const updatedAll = all.map(updatePostCommentReply);
        localStorage.setItem('mock_db_posts', JSON.stringify(updatedAll));
      }
      setReplyText('');
      setActiveReplyCommentId(null);
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/comment/${postId}/${commentId}/reply`, { text: replyText }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(prev => prev.map(p => p._id === postId ? res.data : p));
        setReposts(prev => prev.map(p => p._id === postId ? res.data : p));
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
      const updatedReposts = reposts.filter(p => p._id !== postId);
      setReposts(updatedReposts);

      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const all = JSON.parse(mockPostsStr) as Post[];
        const updatedAll = all.filter(p => p._id !== postId);
        localStorage.setItem('mock_db_posts', JSON.stringify(updatedAll));
      }
      showNotification('Success', 'Post deleted successfully', 'success');
    } else {
      try {
        await axios.delete(`${API_URL}/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(prev => prev.filter(p => p._id !== postId));
        setReposts(prev => prev.filter(p => p._id !== postId));
        showNotification('Success', 'Post deleted successfully', 'success');
      } catch (err) {
        console.error('Error deleting:', err);
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
    if (file.size > 100 * 1024 * 1024) {
      showNotification('File Too Large', 'File size exceeds the 100MB limit.', 'error');
      return;
    }
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
        const updatePostEdit = (p: Post): Post => {
          if (p._id === editingPostId) {
            return {
              ...p,
              caption,
              image: mediaPreview || ''
            };
          }
          return p;
        };

        const updated = posts.map(updatePostEdit);
        setPosts(updated);
        const updatedReposts = reposts.map(updatePostEdit);
        setReposts(updatedReposts);
        
        const mockPostsStr = localStorage.getItem('mock_db_posts');
        if (mockPostsStr) {
          const all = JSON.parse(mockPostsStr) as Post[];
          const updatedAll = all.map(updatePostEdit);
          localStorage.setItem('mock_db_posts', JSON.stringify(updatedAll));
        }

        setCaption('');
        setMediaFile(null);
        setMediaPreview('');
        setEditingPostId(null);
        setIsPostModalOpen(false);
        showNotification('Post Updated', 'Your post has been successfully updated.', 'success');
      }
    } else {
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
          setReposts(prev => prev.map(p => p._id === editingPostId ? res.data : p));
          setCaption('');
          setMediaFile(null);
          setMediaPreview('');
          setEditingPostId(null);
          setIsPostModalOpen(false);
          showNotification('Post Updated', 'Your post has been successfully updated.', 'success');
        }
      } catch (err: any) {
        console.error('Failed to save post:', err);
        const errMsg = err.response?.data?.message || err.message || 'Failed to save post';
        showNotification('Error', errMsg, 'error');
      }
    }
  };

  const fetchUserReposts = async () => {
    if (!id) return;
    setRepostsLoading(true);
    
    // Check if private masked first
    let isPrivateMasked = false;
    if (isMockMode) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      if (mockUsersStr) {
        const list = JSON.parse(mockUsersStr) as any[];
        const found = list.find(u => u._id === id || u.id === id);
        if (found) {
          const isOwner = (found._id || found.id) === user?.id || (found._id || found.id) === user?._id;
          const isAdmin = user?.role === 'admin';
          const connections = found.connections || [];
          const isConnected = connections.includes(user?.id || '') || connections.includes(user?._id || '');
          if (found.isPrivate && !isOwner && !isAdmin && !isConnected) {
            isPrivateMasked = true;
          }
        }
      }
    } else {
      if (profile?.isPrivateMasked) {
        isPrivateMasked = true;
      }
    }

    if (isPrivateMasked) {
      setReposts([]);
      setRepostsLoading(false);
      return;
    }

    if (isMockMode) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      let targetUser: any = null;
      if (mockUsersStr) {
        const list = JSON.parse(mockUsersStr) as any[];
        targetUser = list.find(u => u._id === id || u.id === id);
      }
      if (!targetUser && user && (user.id === id || (user as any)._id === id)) {
        targetUser = user;
      }
      if (targetUser && targetUser.reposts && targetUser.reposts.length > 0) {
        const mockPostsStr = localStorage.getItem('mock_db_posts');
        if (mockPostsStr) {
          const allPosts = JSON.parse(mockPostsStr) as Post[];
          const filtered = allPosts.filter(p => targetUser.reposts.includes(p._id));
          setReposts(filtered);
        } else {
          setReposts([]);
        }
      } else {
        setReposts([]);
      }
      setRepostsLoading(false);
    } else {
      try {
        const res = await axios.get(`${API_URL}/posts/user/${id}/reposts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReposts(res.data);
      } catch (err) {
        console.error('Error fetching user reposts:', err);
        setReposts([]);
      } finally {
        setRepostsLoading(false);
      }
    }
  };

  const handleRepostToggle = async (postId: string) => {
    if (!user) return;
    if (isMockMode) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      const mockCurrentUserStr = localStorage.getItem('mock_db_current_user');
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockUsersStr && mockCurrentUserStr && mockPostsStr) {
        const allUsers = JSON.parse(mockUsersStr) as any[];
        const curr = JSON.parse(mockCurrentUserStr);
        const allPosts = JSON.parse(mockPostsStr) as any[];

        if (!curr.reposts) curr.reposts = [];
        const idx = curr.reposts.indexOf(postId);
        let reposted = false;
        if (idx > -1) {
          curr.reposts.splice(idx, 1);
        } else {
          curr.reposts.push(postId);
          reposted = true;
        }

        const updatePostObject = (p: Post): Post => {
          if (p._id !== postId) return p;
          return {
            ...p,
            sharesCount: Math.max(0, p.sharesCount + (reposted ? 1 : -1))
          };
        };

        const updatedPosts = posts.map(updatePostObject);
        setPosts(updatedPosts);
        
        const updatedReposts = reposts.map(updatePostObject);
        setReposts(updatedReposts);

        const updatedAllPosts = allPosts.map(updatePostObject);
        localStorage.setItem('mock_db_posts', JSON.stringify(updatedAllPosts));

        const updatedUsersList = allUsers.map(u => (u.id === curr.id || u._id === curr.id) ? curr : u);
        localStorage.setItem('mock_db_current_user', JSON.stringify(curr));
        localStorage.setItem('mock_db_users', JSON.stringify(updatedUsersList));
        localStorage.setItem('maatram_user', JSON.stringify(curr));

        await refreshUser();
        await fetchProfile();
        await fetchUserReposts();

        showNotification(
          reposted ? 'Post Reposted' : 'Repost Removed',
          reposted ? 'Post added to your reposts.' : 'Post removed from your reposts.',
          'success'
        );
      }
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/repost/${postId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await refreshUser();
        await fetchProfile();
        await fetchUserPosts();
        await fetchUserReposts();
        showNotification(
          res.data.reposted ? 'Post Reposted' : 'Repost Removed',
          res.data.reposted ? 'Post added to your reposts.' : 'Post removed from your reposts.',
          'success'
        );
      } catch (err: any) {
        console.error('Repost error:', err);
        showNotification('Error', err.response?.data?.message || 'Failed to repost', 'error');
      }
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
    fetchUserReposts();
  }, [id, isMockMode, user]);

  const handleStartChat = () => {
    if (!profile) return;
    navigate(`/dashboard/chat?active=${profile._id}`);
  };

  const handleEditRedirect = () => {
    navigate('/dashboard/settings');
  };

  const handleConnectToggle = async () => {
    if (!profile) return;
    try {
      await toggleConnect(profile._id);
      await fetchProfile();
      await fetchUserPosts();
    } catch (err) {
      console.error('Error toggling connection:', err);
    }
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

  const isOwnProfile = user && (user.id === profile._id || user.id === profile.id || user._id === profile._id || user._id === profile.id);

  const renderPostCard = (post: Post) => {
    const isLiked = user ? post.likes.includes(user.id) || post.likes.includes((user as any)._id) : false;
    const authorMeta = post.author.role === 'alumni' ? 'Alumni' : 'Student';
    const companyMeta = post.author.profile?.company ? ` - ${post.author.profile.company}` : '';
    const batchMeta = post.author.profile?.batch ? ` • Batch ${post.author.profile.batch}` : '';
    const reactionType = getUserReaction(post);

    return (
      <div 
        key={post._id} 
        className="glass-panel" 
        onClick={(e) => handlePostCardClick(e, post)}
        onContextMenu={(e) => handlePostCardContextMenu(e, post._id)}
        style={{ 
          padding: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px', 
          borderColor: 'rgba(255, 215, 0, 0.08)',
          cursor: 'pointer'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div 
            style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setSelectedPreviewUserId(post.author._id || (post.author as any).id)}
          >
            <img
              src={post.author.profile?.avatar || DEFAULT_AVATAR}
              alt={post.author.name}
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-yellow-primary)' }}
            />
            <div>
              <h4 
                style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff', margin: 0 }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-yellow-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
              >
                {post.author.name}
              </h4>
              <span style={{ fontSize: '11px', color: 'var(--color-text-gray)' }}>
                {authorMeta}{companyMeta}{batchMeta}
              </span>
            </div>
          </div>
          
          {/* Edit & Delete controls */}
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
            
            {/* Delete action if allowed */}
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
          <span 
            onClick={() => setShowWhoLikedPostId(post._id)}
            style={{ cursor: 'pointer', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-yellow-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            {renderReactionsSummaryIcons(post)}
            <span>{formatReactionsSummary(post)}</span>
          </span>
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
          <div
            onMouseEnter={() => setHoveredPostId(post._id)}
            onMouseLeave={() => setHoveredPostId(null)}
            style={{ position: 'relative' }}
          >
            {hoveredPostId === post._id && (
              <div className="reaction-popover">
                <span
                  className="reaction-popover-item"
                  onClick={() => handleReact(post._id, 'like')}
                  title="Like"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-yellow-primary)' }}
                >
                  <FiThumbsUp size={20} />
                </span>
                <span
                  className="reaction-popover-item"
                  onClick={() => handleReact(post._id, 'funny')}
                  title="Funny"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-yellow-primary)' }}
                >
                  <FiSmile size={20} />
                </span>
                <span
                  className="reaction-popover-item"
                  onClick={() => handleReact(post._id, 'celebrate')}
                  title="Celebrate"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-yellow-primary)' }}
                >
                  <FiAward size={20} />
                </span>
              </div>
            )}
            <button
              onClick={() => handleLike(post._id)}
              style={{
                background: 'none',
                border: 'none',
                color: reactionType ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                fontWeight: 500,
                transition: 'color 0.2s ease'
              }}
            >
              {renderReactionIcon(reactionType)}
              <span>{getReactionLabel(reactionType)}</span>
            </button>
          </div>

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
            onClick={() => handleRepostToggle(post._id)}
            style={{
              background: 'none',
              border: 'none',
              color: user?.reposts?.includes(post._id) ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 500
            }}
          >
            <FiRepeat size={16} style={{ color: user?.reposts?.includes(post._id) ? 'var(--color-yellow-primary)' : 'inherit' }} />
            <span>Repost</span>
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
              fontSize: '12.5px',
              fontWeight: 500
            }}
          >
            <FiShare2 size={16} />
            <span>Share</span>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto', paddingRight: '2px' }}>
                {post.comments.map((comment, index) => {
                  const commentLikes = comment.likes || [];
                  const commentReplies = comment.replies || [];
                  const isCommentLiked = user ? commentLikes.includes(user.id) || commentLikes.includes((user as any)._id) : false;
                  
                  return (
                    <div key={comment._id || index} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px' }}>
                        <div 
                          onClick={() => setSelectedPreviewUserId(comment.user?._id || (comment.user as any)?.id)} 
                          style={{ cursor: 'pointer' }}
                        >
                          <img
                            src={comment.user?.profile?.avatar || DEFAULT_AVATAR}
                            alt={comment.user?.name}
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,215,0,0.15)' }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '6px 10px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.02)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '2px' }}>
                              <span 
                                onClick={() => setSelectedPreviewUserId(comment.user?._id || (comment.user as any)?.id)} 
                                style={{ cursor: 'pointer', textDecoration: 'none' }}
                              >
                                <h5 style={{ fontWeight: 700, color: 'var(--color-yellow-primary)', margin: 0 }}>{comment.user?.name}</h5>
                              </span>
                              {comment.user?.profile?.company && (
                                <span style={{ fontSize: '10px', color: 'var(--color-text-gray)' }}>
                                  • {comment.user.profile.company}
                                </span>
                              )}
                            </div>
                            <p style={{ color: '#e0e0e0', marginTop: '2px', margin: 0, wordBreak: 'break-word', fontSize: '13.5px' }}>{comment.text}</p>
                          </div>
                          
                          {/* Action row (Like, Reply, stats) */}
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px', paddingLeft: '2px' }}>
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
                            <div key={reply._id || rIdx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '12.5px' }}>
                              <div 
                                onClick={() => setSelectedPreviewUserId(reply.user?._id || (reply.user as any)?.id)} 
                                style={{ cursor: 'pointer' }}
                              >
                                <img
                                  src={reply.user?.profile?.avatar || DEFAULT_AVATAR}
                                  alt={reply.user?.name}
                                  style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  background: 'rgba(255,255,255,0.015)',
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255,255,255,0.01)'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '1px' }}>
                                    <span 
                                      onClick={() => setSelectedPreviewUserId(reply.user?._id || (reply.user as any)?.id)} 
                                      style={{ cursor: 'pointer', textDecoration: 'none' }}
                                    >
                                      <h6 style={{ fontWeight: 700, color: 'var(--color-yellow-primary)', margin: 0 }}>{reply.user?.name}</h6>
                                    </span>
                                    {reply.user?.profile?.company && (
                                      <span style={{ fontSize: '9px', color: 'var(--color-text-gray)' }}>
                                        • {reply.user.profile.company}
                                      </span>
                                    )}
                                  </div>
                                  <p style={{ color: '#d0d0d0', margin: 0, wordBreak: 'break-word' }}>{reply.text}</p>
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '2px', paddingLeft: '2px' }}>
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
                              fontSize: '12.5px',
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
  };

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
            src={profile.profile?.avatar || DEFAULT_AVATAR}
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
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {isOwnProfile ? (
                <button className="btn-primary" onClick={handleEditRedirect} style={{ gap: '6px', padding: '8px 16px', fontSize: '13px' }}>
                  <FiEdit3 /> Edit Profile
                </button>
              ) : (
                <>
                  <button
                    className={profile.connections?.includes(user?.id || '') || profile.connections?.includes(user?._id || '') ? "btn-outline" : "btn-primary"}
                    onClick={handleConnectToggle}
                    style={{
                      gap: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      borderColor: profile.connections?.includes(user?.id || '') || profile.connections?.includes(user?._id || '') ? 'var(--color-yellow-primary)' : undefined,
                      color: profile.connections?.includes(user?.id || '') || profile.connections?.includes(user?._id || '') ? 'var(--color-yellow-primary)' : undefined
                    }}
                  >
                    {profile.connections?.includes(user?.id || '') || profile.connections?.includes(user?._id || '') ? (
                      <>
                        <FiUserCheck /> Connected
                      </>
                    ) : (
                      <>
                        <FiUserPlus /> Connect
                      </>
                    )}
                  </button>
                  <button className="btn-primary" onClick={handleStartChat} style={{ gap: '6px', padding: '8px 16px', fontSize: '13px' }}>
                    <FiMessageSquare /> Send Message
                  </button>
                </>
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

            {isOwnProfile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-gray)' }}>
                <FiMail style={{ color: 'var(--color-yellow-primary)' }} />
                <div>
                  <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)' }}>Email address</span>
                  <span style={{ color: '#ffffff', fontWeight: 500, wordBreak: 'break-all' }}>
                    {profile.email}
                  </span>
                </div>
              </div>
            )}

            {!profile.isPrivateMasked && profile.profile?.gender && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-gray)' }}>
                <FiUser style={{ color: 'var(--color-yellow-primary)' }} />
                <div>
                  <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)' }}>Gender</span>
                  <span style={{ color: '#ffffff', fontWeight: 500 }}>{profile.profile.gender}</span>
                </div>
              </div>
            )}

            {!profile.isPrivateMasked && profile.profile?.education && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-gray)' }}>
                <FiBookOpen style={{ color: 'var(--color-yellow-primary)' }} />
                <div>
                  <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)' }}>Education</span>
                  <span style={{ color: '#ffffff', fontWeight: 500 }}>{profile.profile.education}</span>
                </div>
              </div>
            )}

            {!profile.isPrivateMasked && profile.profile?.college && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-gray)' }}>
                <FiAward style={{ color: 'var(--color-yellow-primary)' }} />
                <div>
                  <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)' }}>College / University</span>
                  <span style={{ color: '#ffffff', fontWeight: 500 }}>{profile.profile.college}</span>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Under splits (Skills & Activities) */}
      {profile.isPrivateMasked && !isOwnProfile ? (
        <div 
          className="glass-panel" 
          style={{ 
            marginTop: '30px', 
            padding: '60px 30px', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '20px',
            borderColor: 'rgba(255, 215, 0, 0.15)',
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)'
          }}
        >
          <div 
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'rgba(255, 215, 0, 0.05)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              boxShadow: '0 0 25px rgba(255, 215, 0, 0.1)',
              color: 'var(--color-yellow-primary)'
            }}
          >
            <FiLock size={36} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)' }}>
            This Profile is Private
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', maxWidth: '480px', margin: 0, lineHeight: '1.6' }}>
            Connect with this scholar or alumni to view their career background, academic details, skills, achievements, and community posts.
          </p>
          <button 
            className="btn-primary" 
            onClick={handleConnectToggle}
            style={{ 
              marginTop: '10px', 
              padding: '10px 24px', 
              fontSize: '14px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FiUserPlus /> Connect with {profile.name}
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '0.4fr 1.6fr',
          gap: '30px',
          marginTop: '30px',
          alignItems: 'start'
        }} className="profile-under-grid">
        
        {/* Sidebar Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Skills Card */}
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

          {/* Work Experience Timeline Card */}
          <div className="glass-panel" style={{ padding: '24px', borderColor: 'rgba(255,215,0,0.08)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiBriefcase style={{ color: 'var(--color-yellow-primary)' }} /> Work Experience
            </h3>
            
            {profile.profile?.experience && profile.profile.experience.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '20px', gap: '20px' }}>
                {/* Vertical timeline line */}
                <div style={{
                  position: 'absolute',
                  left: '4px',
                  top: '6px',
                  bottom: '6px',
                  width: '2px',
                  background: 'linear-gradient(to bottom, var(--color-yellow-primary) 0%, rgba(255, 215, 0, 0.1) 100%)'
                }} />
                
                {profile.profile.experience.map((exp, idx) => (
                  <div key={exp._id || idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* Glowing Timeline Dot */}
                    <div style={{
                      position: 'absolute',
                      left: '-20px',
                      top: '4px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-yellow-primary)',
                      border: '2px solid #000000',
                      boxShadow: '0 0 8px var(--color-yellow-primary)'
                    }} />
                    
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                      {exp.title}
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--color-yellow-primary)', margin: 0, fontWeight: 500 }}>
                      {exp.company} {exp.location ? `• ${exp.location}` : ''}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                      {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                    </p>
                    {exp.description && (
                      <p style={{ fontSize: '11.5px', color: 'var(--color-text-gray)', margin: '4px 0 0 0', lineHeight: '1.4', fontStyle: 'italic' }}>
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px 0' }}>
                No work experience listed yet.
              </div>
            )}
          </div>

        </div>

        {/* Profile activity list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 4px 0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)', margin: 0 }}>
              Activity Feed
            </h3>
          </div>

          {/* Tabs navigation */}
          <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--color-border-glass)', paddingBottom: '10px', marginBottom: '10px' }}>
            <button
              onClick={() => setActiveTab('posts')}
              style={{
                background: 'none',
                border: 'none',
                paddingBottom: '8px',
                color: activeTab === 'posts' ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
                borderBottom: activeTab === 'posts' ? '2px solid var(--color-yellow-primary)' : 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px'
              }}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('reposts')}
              style={{
                background: 'none',
                border: 'none',
                paddingBottom: '8px',
                color: activeTab === 'reposts' ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
                borderBottom: activeTab === 'reposts' ? '2px solid var(--color-yellow-primary)' : 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px'
              }}
            >
              Reposts
            </button>
          </div>

          {activeTab === 'posts' ? (
            postsLoading ? (
              <div style={{ color: 'var(--color-text-gray)', fontSize: '14px' }}>Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
                No posts or updates shared yet by {profile.name}.
              </div>
            ) : (
              posts.map(post => renderPostCard(post))
            )
          ) : (
            repostsLoading ? (
              <div style={{ color: 'var(--color-text-gray)', fontSize: '14px' }}>Loading reposts...</div>
            ) : reposts.length === 0 ? (
              <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
                No reposted updates yet by {profile.name}.
              </div>
            ) : (
              reposts.map(post => renderPostCard(post))
            )
          )}
        </div>
      </div>
    )}

      {/* Edit Post Modal */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="notification-overlay" onClick={handleClosePostModal}>
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
                      onClick={() => document.getElementById('profile-media-input')?.click()}
                    >
                      <FiPlus size={24} style={{ color: 'var(--color-yellow-primary)' }} />
                      <span style={{ fontSize: '13px', color: '#e0e0e0', fontWeight: 555 }}>
                        Drag & drop or click to upload
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Supports JPEG, PNG, MP4, WebM (Max 100MB)
                      </span>
                      <input
                        type="file"
                        id="profile-media-input"
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
                    style={{ flex: 1, justifyItems: 'center', justifyContent: 'center' }}
                  >
                    {editingPostId ? 'Save Changes' : 'Publish Post'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Publication/Edit Confirmation Modal */}
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {postToDelete && (
          <div className="notification-overlay" style={{ zIndex: 10010, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)' }} onClick={() => setPostToDelete(null)}>
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

      {/* Who Liked Modal */}
      <AnimatePresence>
        {showWhoLikedPostId && (() => {
          const post = posts.find(p => p._id === showWhoLikedPostId);
          if (!post) return null;
          const likers = getLikesUsers(post);
          return (
            <div 
              className="notification-overlay" 
              style={{ zIndex: 10010, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)' }} 
              onClick={() => setShowWhoLikedPostId(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-panel"
                style={{
                  width: '90%',
                  maxWidth: '400px',
                  maxHeight: '70vh',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px',
                  border: '1px solid var(--color-yellow-primary)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                  background: 'rgba(10, 10, 10, 0.95)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-title)', color: '#ffffff', margin: 0 }}>
                    Likes ({likers.length})
                  </h3>
                  <button 
                    onClick={() => setShowWhoLikedPostId(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-gray)', cursor: 'pointer' }}
                  >
                    <FiX size={20} />
                  </button>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                  {likers.length === 0 ? (
                    <div style={{ color: 'var(--color-text-gray)', textAlign: 'center', fontSize: '13px', padding: '20px 0' }}>
                      No likes yet.
                    </div>
                  ) : (
                    likers.map((u) => {
                      const userRole = u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : '';
                      const userCompany = u.profile?.company ? ` • ${u.profile.company}` : '';
                      return (
                        <div 
                          key={u._id} 
                          style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }}
                          onClick={() => {
                            setShowWhoLikedPostId(null);
                            setSelectedPreviewUserId(u._id);
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <img
                            src={u.profile?.avatar || DEFAULT_AVATAR}
                            alt={u.name}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255, 215, 0, 0.15)' }}
                          />
                          <div>
                            <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                              {u.name}
                            </h4>
                            <p style={{ fontSize: '11px', color: 'var(--color-text-gray)', margin: '2px 0 0 0' }}>
                              {userRole}{userCompany}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
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

      {/* Post Options Modal */}
      <AnimatePresence>
        {activePostOptions && (
          <div 
            onClick={() => setActivePostOptions(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '24px',
                borderColor: 'rgba(255,215,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-glass)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Post Options
                </h3>
                <button 
                  onClick={() => setActivePostOptions(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-gray)', cursor: 'pointer' }}
                >
                  <FiX size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Like Option */}
                <button
                  onClick={() => {
                    handleLike(activePostOptions._id);
                    setActivePostOptions(null);
                  }}
                  className="btn-outline"
                  style={{
                    justifyContent: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    borderColor: activePostOptions.likes.includes(user?.id || (user as any)?._id) ? 'var(--color-yellow-primary)' : 'rgba(255,255,255,0.08)',
                    color: activePostOptions.likes.includes(user?.id || (user as any)?._id) ? 'var(--color-yellow-primary)' : '#ffffff'
                  }}
                >
                  <FiHeart fill={activePostOptions.likes.includes(user?.id || (user as any)?._id) ? 'var(--color-yellow-primary)' : 'none'} size={18} />
                  {activePostOptions.likes.includes(user?.id || (user as any)?._id) ? 'Unlike Post' : 'Like Post'}
                </button>

                {/* Comment Option */}
                <button
                  onClick={() => {
                    setActiveCommentsPostId(activeCommentsPostId === activePostOptions._id ? null : activePostOptions._id);
                    setActivePostOptions(null);
                  }}
                  className="btn-outline"
                  style={{
                    justifyContent: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: '#ffffff'
                  }}
                >
                  <FiMessageSquare size={18} />
                  Comment on Post
                </button>

                {/* Repost Option */}
                <button
                  onClick={() => {
                    handleRepostToggle(activePostOptions._id);
                    setActivePostOptions(null);
                  }}
                  className="btn-outline"
                  style={{
                    justifyContent: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    borderColor: user?.reposts?.includes(activePostOptions._id) ? 'var(--color-yellow-primary)' : 'rgba(255,255,255,0.08)',
                    color: user?.reposts?.includes(activePostOptions._id) ? 'var(--color-yellow-primary)' : '#ffffff'
                  }}
                >
                  <FiShare2 size={18} />
                  {user?.reposts?.includes(activePostOptions._id) ? 'Undo Repost' : 'Repost / Share'}
                </button>

                {/* Copy Link Option */}
                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/dashboard/feed?post=${activePostOptions._id}`;
                    navigator.clipboard.writeText(shareUrl);
                    showNotification('Success', 'Post link copied to clipboard!', 'success');
                    setActivePostOptions(null);
                  }}
                  className="btn-outline"
                  style={{
                    justifyContent: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: '#ffffff'
                  }}
                >
                  <FiCopy size={18} />
                  Copy Post Link
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </ AnimatePresence>

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
