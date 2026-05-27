import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_URL, DEFAULT_AVATAR } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { TreeAnimation } from '../components/TreeAnimation';
import { FiUsers, FiFileText, FiCalendar, FiAward, FiPlus, FiHeart, FiMessageSquare, FiSend, FiBookmark, FiTrash2, FiShare2, FiCopy, FiLinkedin, FiTwitter, FiX, FiSearch, FiEdit3, FiCheck, FiThumbsUp, FiSmile, FiRepeat, FiSun, FiStar, FiPlay } from 'react-icons/fi';
import { ThumbsUp, PartyPopper, HeartHandshake, Lightbulb, Eye, Sparkles } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfilePopup } from '../components/UserProfilePopup';

interface Reply {
  _id: string;
  user: {
    _id: string;
    name: string;
    role?: string;
    profile: {
      avatar: string;
      company?: string;
      batch?: string;
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
      batch?: string;
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
  type: string;
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

const reactionConfig: Record<string, { icon: any, color: string, label: string }> = {
  like: { icon: ThumbsUp, color: '#3b82f6', label: 'Like' },
  celebrate: { icon: PartyPopper, color: '#22c55e', label: 'Celebrate' },
  support: { icon: HeartHandshake, color: '#a855f7', label: 'Support' },
  insightful: { icon: Lightbulb, color: '#eab308', label: 'Insightful' },
  interested: { icon: Eye, color: '#f97316', label: 'Interested' },
  appreciate: { icon: Sparkles, color: '#ef4444', label: 'Appreciate' },
};

export const Dashboard = () => {
  const { user, token, toggleSavePost, refreshUser } = useAuth();
  const isMockMode = false;
  const { showNotification } = useNotification();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // Modal create post
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
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
  const [activePostOptions, setActivePostOptions] = useState<Post | null>(null);

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

  // Comment drawers
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showWhoLikedPostId, setShowWhoLikedPostId] = useState<string | null>(null);
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const [hoveredPostIdForReactions, setHoveredPostIdForReactions] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        verticalAlign: 'middle'
      }}>
        {text}
      </span>
    );
  };

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
    
    // Fetch pending approvals for admin notification
    if (user?.role === 'admin') {
      if (isMockMode) {
        const mockUsersStr = localStorage.getItem('mock_db_users');
        if (mockUsersStr) {
          const allUsers = JSON.parse(mockUsersStr) as any[];
          const pendingCount = allUsers.filter(u => (u.role === 'alumni' || u.role === 'student') && !u.isVerified).length;
          setPendingApprovalsCount(pendingCount);
        }
      } else {
        axios.get(`${API_URL}/users/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => {
          setPendingApprovalsCount(res.data.unverifiedAlumniCount || 0);
        })
        .catch(err => console.error('Error fetching admin analytics:', err));
      }
    }
  }, [ user, token]);

  useEffect(() => {
    const isAnyModalOpen = isPostModalOpen || showPostConfirm || showSuccessModal || (sharingPost !== null) || (postToDelete !== null) || (selectedPreviewUserId !== null) || (activePostOptions !== null);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPostModalOpen, showPostConfirm, showSuccessModal, sharingPost, postToDelete, selectedPreviewUserId, activePostOptions]);

  // Handle Like (default is toggle like)
  const handleLike = async (postId: string) => {
    await handleReact(postId, 'like');
  };

  // Handle React
  const handleReact = async (postId: string, type: string) => {
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
      
      const updatedAllPosts = all.map(updatePostObject);
      localStorage.setItem('mock_db_posts', JSON.stringify(updatedAllPosts));
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/react/${postId}`, { type }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(prev => prev.map(p => p._id === postId ? res.data : p));
      } catch (err) {
        console.error('Error reacting to post:', err);
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
    if (file.size > 100 * 1024 * 1024) {
      showNotification('File Too Large', 'Please select a file smaller than 100MB', 'error');
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
      setIsPostModalOpen(false);
      setEditingPostId(null);
      setCaption('');
      setMediaFile(null);
      setMediaPreview('');
      showNotification('Uploading...', 'Your post is being processed in the background.', 'success');

      if (editingPostId) {
        const formData = new FormData();
        formData.append('caption', caption);
        if (mediaFile) {
          formData.append('mediaFile', mediaFile);
        }

        axios.put(
          `${API_URL}/posts/${editingPostId}`,
          formData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        ).then(res => {
          setPosts(prev => prev.map(p => p._id === editingPostId ? res.data : p));
          showNotification('Post Updated', 'Your post has been successfully updated.', 'success');
        }).catch(err => {
          console.error('Failed to save post:', err);
          const errMsg = err.response?.data?.message || err.message || 'Failed to save post';
          showNotification('Error', errMsg, 'error');
        }).finally(() => {
          setIsPublishing(false);
        });
      } else {
        const formData = new FormData();
        formData.append('caption', caption);
        if (mediaFile) {
          formData.append('mediaFile', mediaFile);
        }

        axios.post(
          `${API_URL}/posts`,
          formData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        ).then(res => {
          setPosts(prev => [res.data, ...prev]);
          setShowSuccessModal(true);
        }).catch(err => {
          console.error('Failed to save post:', err);
          const errMsg = err.response?.data?.message || err.message || 'Failed to save post';
          showNotification('Error', errMsg, 'error');
        }).finally(() => {
          setIsPublishing(false);
        });
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

        const updatedAllPosts = allPosts.map(updatePostObject);
        localStorage.setItem('mock_db_posts', JSON.stringify(updatedAllPosts));

        const updatedUsersList = allUsers.map(u => u.id === curr.id || u._id === curr.id ? curr : u);
        localStorage.setItem('mock_db_current_user', JSON.stringify(curr));
        localStorage.setItem('mock_db_users', JSON.stringify(updatedUsersList));
        localStorage.setItem('maatram_user', JSON.stringify(curr));

        await refreshUser();

        showNotification(
          reposted ? 'Post Reposted' : 'Repost Removed',
          reposted ? 'Post added to your reposts.' : 'Post removed from your reposts.',
          'success'
        );
      }
    } else {
      const repostedAlready = user?.reposts?.includes(postId);
      setPosts(prev => prev.map(p => p._id === postId ? {
        ...p,
        sharesCount: Math.max(0, p.sharesCount + (repostedAlready ? -1 : 1))
      } : p));

      axios.post(`${API_URL}/posts/repost/${postId}`).then(res => {
        refreshUser();
        fetchPosts();
        showNotification(
          res.data.reposted ? 'Post Reposted' : 'Repost Removed',
          res.data.reposted ? 'Post added to your reposts.' : 'Post removed from your reposts.',
          'success'
        );
      }).catch((err: any) => {
        fetchPosts(); // revert optimistic
        console.error('Repost error:', err);
        showNotification('Error', err.response?.data?.message || 'Failed to repost', 'error');
      });
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

  // Helper to safely check if a user has liked a post (handles populated objects and strings)
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
              role: user?.role || '',
              profile: { 
                avatar: user?.profile?.avatar || '',
                company: user?.profile?.company || ''
              }
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

  // Handle Comment Like
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

  // Handle Reply Submission
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
                  role: user.role,
                  profile: { 
                    avatar: user.profile?.avatar || '',
                    company: user.profile?.company || ''
                  }
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

  return (
    <div style={{ padding: '10px 0', fontFamily: 'var(--font-body)' }}>
      {/* Top Banner area */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px',
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
          onClick={() => {
            setEditingPostId(null);
            setCaption('');
            setMediaPreview('');
            setMediaFile(null);
            setIsPostModalOpen(true);
          }}
          className="btn-primary"
          style={{ gap: '8px' }}
        >
          <FiPlus size={18} /> Create Post
        </button>
      </div>

      {/* Admin Pending Approvals Banner */}
      {user?.role === 'admin' && pendingApprovalsCount > 0 && (
        <div style={{
          background: 'rgba(255, 215, 0, 0.1)',
          border: '1px solid var(--color-yellow-primary)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'var(--color-yellow-primary)',
              color: '#000',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiUsers size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-yellow-primary)', margin: 0 }}>
                Pending Approvals
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-gray)', margin: '2px 0 0 0' }}>
                You have {pendingApprovalsCount} new account registrations awaiting verification.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard/admin'}
            style={{
              padding: '8px 16px',
              background: 'var(--color-yellow-primary)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Review Now
          </button>
        </div>
      )}

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

          {/* Search bar & Filter tabs */}
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '14px', borderColor: 'rgba(255, 215, 0, 0.1)' }}>
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
                { id: 'student', label: 'Scholar Posts' }
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

          {loadingPosts ? (
            <div style={{ color: 'var(--color-text-gray)', fontSize: '14px' }}>Loading feed...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="glass-panel" style={{ padding: '35px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
              {searchQuery || activeFilter !== 'all' ? 'No matches found. Try modifying your search or filters.' : 'No posts found. Be the first to share an update!'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredPosts.map((post) => {
                const userId = user?.id || (user as any)?._id;
                const isLiked = user ? post.likes.includes(userId) : false;
                const userReaction = post.reactions?.find(r => (typeof r.user === 'object' ? r.user._id === userId || (r.user as any).id === userId : r.user === userId))?.type;
                const isSaved = user?.savedPosts?.includes(post._id) || false;
                const authorMeta = post.author.profile?.company ? `${post.author.role === 'alumni' ? 'Alumni' : 'Student'} - ${post.author.profile.company}` : `${post.author.role === 'alumni' ? 'Alumni' : 'Student'}`;
                const batchMeta = post.author.profile?.batch ? ` (${post.author.profile.batch})` : '';

                 return (
                  <div 
                    key={post._id} 
                    className="glass-panel" 
                    onClick={(e) => handlePostCardClick(e, post)}
                    onContextMenu={(e) => handlePostCardContextMenu(e, post._id)}
                    style={{ 
                      padding: '24px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '16px',
                      borderColor: 'rgba(255,215,0,0.08)',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div 
                        style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setSelectedPreviewUserId(post.author._id || (post.author as any).id)}
                      >
                        <img
                          src={post.author.profile?.avatar || DEFAULT_AVATAR}
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
                        {/* Edit option removed as per requirements */}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {post.reactions && post.reactions.length > 0 ? (
                          <>
                            <div style={{ display: 'flex' }}>
                              {Array.from(new Set(post.reactions.map(r => r.type))).slice(0, 3).map((type, i) => {
                                const config = reactionConfig[type];
                                if (!config) return null;
                                const Icon = config.icon;
                                return (
                                  <div key={type} style={{
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    background: config.color, color: '#000',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginLeft: i > 0 ? '-6px' : '0', border: '1px solid rgba(0,0,0,0.8)', zIndex: 3 - i
                                  }}>
                                    <Icon size={10} />
                                  </div>
                                );
                              })}
                            </div>
                            <span>
                              {post.reactions.length > 0 && (
                                post.reactions.length === 1 ? (
                                  <>Liked by <span style={{ color: '#fff', fontWeight: 600 }}>{typeof post.reactions[0].user === 'object' ? (post.reactions[0].user as any).name : 'Someone'}</span></>
                                ) : (
                                  <>Liked by <span style={{ color: '#fff', fontWeight: 600 }}>{typeof post.reactions[0].user === 'object' ? (post.reactions[0].user as any).name : 'Someone'}</span> and {post.reactions.length - 1} other{post.reactions.length - 1 === 1 ? '' : 's'}</>
                                )
                              )}
                            </span>
                          </>
                        ) : (
                          <span>{post.likes.length} Likes</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span>{post.comments.length} Comments</span>
                        
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      position: 'relative',
                      padding: '4px 0'
                    }}>
                      <div 
                        style={{
                          position: 'relative',
                          userSelect: 'none',
                          WebkitTouchCallout: 'none',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onMouseEnter={() => {
                          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = setTimeout(() => setHoveredPostIdForReactions(post._id), 300);
                        }}
                        onMouseLeave={() => {
                          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = setTimeout(() => setHoveredPostIdForReactions(null), 300);
                        }}
                        onTouchStart={(e) => {
                          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = setTimeout(() => {
                             setHoveredPostIdForReactions(post._id);
                             hoverTimeoutRef.current = null;
                          }, 500);
                        }}
                        onTouchEnd={(e) => {
                          if (hoverTimeoutRef.current) {
                             clearTimeout(hoverTimeoutRef.current);
                             hoverTimeoutRef.current = null;
                          } else {
                             if (hoveredPostIdForReactions === post._id) {
                                 e.preventDefault(); 
                             }
                          }
                        }}
                        onTouchCancel={() => {
                          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                          setHoveredPostIdForReactions(null);
                        }}
                      >
                        <AnimatePresence>
                          {hoveredPostIdForReactions === post._id && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 5px)',
                                left: '-10px',
                                background: '#1a1a1a',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '30px',
                                padding: '6px 12px',
                                display: 'flex',
                                gap: '12px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                zIndex: 100
                              }}
                            >
                              {/* Invisible bridge to prevent mouse leave gap */}
                              <div style={{
                                position: 'absolute',
                                bottom: '-15px',
                                left: 0,
                                right: 0,
                                height: '15px'
                              }} />
                              
                              {Object.entries(reactionConfig).map(([type, config]) => {
                                const Icon = config.icon;
                                return (
                                  <button
                                    key={type}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReact(post._id, type);
                                      setHoveredPostIdForReactions(null);
                                    }}
                                    className="reaction-icon-btn"
                                    title={config.label}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: 0,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                    }}
                                  >
                                    <div style={{
                                      width: '38px', height: '38px', borderRadius: '50%',
                                      background: `${config.color}15`,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      color: config.color,
                                      border: `1px solid ${config.color}40`
                                    }}>
                                      <Icon size={20} strokeWidth={2} />
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--color-text-gray)', fontWeight: 500 }}>
                                      {config.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hoveredPostIdForReactions === post._id) return;
                            handleReact(post._id, userReaction || 'like');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: userReaction ? reactionConfig[userReaction].color : 'var(--color-text-gray)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            pointerEvents: 'auto'
                          }}
                        >
                          {userReaction ? React.createElement(reactionConfig[userReaction].icon, { size: 18, strokeWidth: 2 }) : <ThumbsUp size={18} strokeWidth={2} />}
                          <span>{userReaction ? reactionConfig[userReaction].label : 'Like'}</span>
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
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        <FiMessageSquare size={18} />
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
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        <FiRepeat size={18} style={{ color: user?.reposts?.includes(post._id) ? 'var(--color-yellow-primary)' : 'inherit' }} />
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto', paddingRight: '2px' }}>
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
                                                  <span style={{ fontSize: '10.5px', color: 'var(--color-text-gray)' }}>
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
                      onClick={() => document.getElementById('dashboard-media-input')?.click()}
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
                    onClick={handleClosePostModal}
                    className="btn-outline"
                    style={{ flex: 1, justifyItems: 'center', justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isPublishing}
                    style={{ flex: 1, justifyItems: 'center', justifyContent: 'center', opacity: isPublishing ? 0.7 : 1, cursor: isPublishing ? 'not-allowed' : 'pointer' }}
                  >
                    {isPublishing ? 'Publishing...' : (editingPostId ? 'Save Changes' : 'Publish Post')}
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
              zIndex: 10000,
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
                maxWidth: '650px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '24px',
                borderColor: 'rgba(255,215,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-glass)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <img
                    src={activePostOptions.author.profile?.avatar || DEFAULT_AVATAR}
                    alt={activePostOptions.author.name}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid var(--color-yellow-primary)'
                    }}
                  />
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                      {activePostOptions.author.name}
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-gray)' }}>
                      {activePostOptions.author.role}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setActivePostOptions(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-gray)', cursor: 'pointer' }}
                >
                  <FiX size={20} />
                </button>
              </div>

              <div style={{ fontSize: '15px', color: '#e0e0e0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {activePostOptions.caption}
              </div>

              {activePostOptions.image && (
                <div style={{ borderRadius: '10px', overflow: 'hidden', background: '#000' }}>
                  {activePostOptions.image.startsWith('data:video/') || activePostOptions.image.match(/\.(mp4|webm|ogg|mov)($|\?)/i) ? (
                    <video
                      src={activePostOptions.image}
                      controls
                      style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block' }}
                    />
                  ) : (
                    <img
                      src={activePostOptions.image}
                      alt="Post Media"
                      style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block' }}
                    />
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--color-border-glass)', paddingTop: '16px' }}>
                {/* Like Option */}
                <button
                  onClick={() => {
                    handleReact(activePostOptions._id, 'like');
                    setActivePostOptions(null);
                  }}
                  className="btn-outline"
                  style={{
                    flex: '1 1 calc(50% - 5px)',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderColor: activePostOptions.likes.includes(user?.id || (user as any)?._id) ? 'var(--color-yellow-primary)' : 'rgba(255,255,255,0.08)',
                    color: activePostOptions.likes.includes(user?.id || (user as any)?._id) ? 'var(--color-yellow-primary)' : '#ffffff'
                  }}
                >
                  <FiHeart fill={activePostOptions.likes.includes(user?.id || (user as any)?._id) ? 'var(--color-yellow-primary)' : 'none'} size={16} />
                  {activePostOptions.likes.includes(user?.id || (user as any)?._id) ? 'Unlike' : 'Like'}
                </button>

                {/* Comment Option */}
                <button
                  onClick={() => {
                    setActiveCommentsPostId(activeCommentsPostId === activePostOptions._id ? null : activePostOptions._id);
                    setActivePostOptions(null);
                  }}
                  className="btn-outline"
                  style={{
                    flex: '1 1 calc(50% - 5px)',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: '#ffffff'
                  }}
                >
                  <FiMessageSquare size={16} />
                  Comment
                </button>

                

                {/* Save Option */}
                <button
                  onClick={() => {
                    toggleSavePost(activePostOptions._id);
                    setActivePostOptions(null);
                  }}
                  className="btn-outline"
                  style={{
                    flex: '1 1 calc(50% - 5px)',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderColor: user?.savedPosts?.includes(activePostOptions._id) ? 'var(--color-yellow-primary)' : 'rgba(255,255,255,0.08)',
                    color: user?.savedPosts?.includes(activePostOptions._id) ? 'var(--color-yellow-primary)' : '#ffffff'
                  }}
                >
                  <FiBookmark fill={user?.savedPosts?.includes(activePostOptions._id) ? 'var(--color-yellow-primary)' : 'none'} size={16} />
                  {user?.savedPosts?.includes(activePostOptions._id) ? 'Saved' : 'Save'}
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
