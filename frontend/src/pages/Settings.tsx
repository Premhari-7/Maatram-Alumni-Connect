import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { 
  FiSave, FiUser, FiInfo, FiSliders, FiImage, FiBriefcase, 
  FiBookmark, FiHeart, FiMessageSquare, FiShare2, FiLock, FiUnlock, FiX, FiCheckCircle,
  FiEdit3, FiTrash2
} from 'react-icons/fi';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfilePopup } from '../components/UserProfilePopup';

interface Reply {
  _id?: string;
  user: {
    _id: string;
    name: string;
    role: string;
    profile: {
      avatar?: string;
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
    role: string;
    profile: {
      avatar?: string;
      company?: string;
    };
  };
  text: string;
  likes?: string[];
  replies?: Reply[];
  createdAt: string;
}

interface Post {
  _id: string;
  author: {
    _id: string;
    name: string;
    role: string;
    profile?: {
      avatar?: string;
      batch?: string;
      company?: string;
    };
  };
  caption: string;
  image?: string;
  likes: any[];
  comments: Comment[];
  sharesCount: number;
  createdAt: string;
}

const DEPARTMENTS_LIST = [
  "Computer Science & Engineering",
  "Information Technology",
  "Artificial Intelligence & Data Science",
  "Computer Technology",
  "Cyber Security & Digital Forensics",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Biomedical Engineering",
  "Automobile Engineering",
  "Mechatronics Engineering",
  "Food Technology",
  "Aerospace Engineering",
  "Computer Applications (BCA/MCA)",
  "Business Administration (BBA/MBA)",
  "Commerce (B.Com/M.Com)",
  "Nursing & Allied Health",
  "Pharmacy & Pharmaceutical Sciences",
  "Science & Humanities (Math/Physics/Chemistry)",
  "English & Applied Literature"
];

export const Settings = () => {
  const { user, token, isMockMode, refreshUser, toggleSavePost } = useAuth();
  const { showNotification } = useNotification();

  const [activeTab, setActiveTab] = useState<'basics' | 'saved' | 'privacy' | 'experience'>('basics');

  // Experience States
  const [experiences, setExperiences] = useState<any[]>(user?.profile?.experience || []);
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [expTitle, setExpTitle] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expLocation, setExpLocation] = useState('');
  const [expStartDate, setExpStartDate] = useState('');
  const [expEndDate, setExpEndDate] = useState('');
  const [expCurrent, setExpCurrent] = useState(false);
  const [expDescription, setExpDescription] = useState('');

  // Form State
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [avatar, setAvatar] = useState(user?.profile?.avatar || '');
  const [cover, setCover] = useState(user?.profile?.cover || '');
  const [department, setDepartment] = useState(user?.profile?.department || '');
  const [batch, setBatch] = useState(user?.profile?.batch || '');
  const [skills, setSkills] = useState(user?.profile?.skills?.join(', ') || '');
  const [company, setCompany] = useState(user?.profile?.company || '');
  const [jobTitle, setJobTitle] = useState(user?.profile?.jobTitle || '');
  const [gender, setGender] = useState(user?.profile?.gender || '');
  const [education, setEducation] = useState(user?.profile?.education || '');
  const [college, setCollege] = useState(user?.profile?.college || '');

  // Privacy State
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);

  // Saved Posts States
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<{ [postId: string]: string }>({});
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showWhoLikedPostId, setShowWhoLikedPostId] = useState<string | null>(null);
  const [selectedPreviewUserId, setSelectedPreviewUserId] = useState<string | null>(null);

  // Upload Progress Tracking
  const [avatarProgress, setAvatarProgress] = useState<number | null>(null);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);

  // Department Selection States
  const [isOtherDept, setIsOtherDept] = useState(() => {
    if (!user?.profile?.department) return false;
    return !DEPARTMENTS_LIST.includes(user.profile.department);
  });

  const [saving, setSaving] = useState(false);

  // Sync state when user details load/change
  useEffect(() => {
    if (user) {
      setIsPrivate(user.isPrivate || false);
      setName(user.name || '');
      setBio(user.profile?.bio || '');
      setAvatar(user.profile?.avatar || '');
      setCover(user.profile?.cover || '');
      setDepartment(user.profile?.department || '');
      setBatch(user.profile?.batch || '');
      setSkills(user.profile?.skills?.join(', ') || '');
      setCompany(user.profile?.company || '');
      setJobTitle(user.profile?.jobTitle || '');
      setGender(user.profile?.gender || '');
      setEducation(user.profile?.education || '');
      setCollege(user.profile?.college || '');
      setExperiences(user.profile?.experience || []);

      const isOther = user.profile?.department ? !DEPARTMENTS_LIST.includes(user.profile.department) : false;
      setIsOtherDept(isOther);
    }
  }, [user]);

  // Load Saved Posts when saved tab active
  const fetchSavedPosts = async () => {
    setLoadingSaved(true);
    if (isMockMode) {
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr && user) {
        const allPosts = JSON.parse(mockPostsStr) as any[];
        const saved = allPosts.filter(p => user.savedPosts?.includes(p._id));
        setSavedPosts(saved);
      } else {
        setSavedPosts([]);
      }
      setLoadingSaved(false);
    } else {
      try {
        const res = await axios.get(`${API_URL}/posts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (user) {
          const saved = res.data.filter((p: any) => user.savedPosts?.includes(p._id));
          setSavedPosts(saved);
        }
      } catch (err) {
        console.error('Error fetching saved posts:', err);
      } finally {
        setLoadingSaved(false);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedPosts();
    }
  }, [activeTab, user?.savedPosts]);

  // Handle Save/Unsave from settings
  const handleSaveToggle = async (postId: string) => {
    const saved = await toggleSavePost(postId);
    if (!saved) {
      setSavedPosts(prev => prev.filter(p => p._id !== postId));
    }
  };

  // Like saved post
  const handleLike = async (postId: string) => {
    if (!user) return;
    const userId = user.id || (user as any)._id;
    if (isMockMode) {
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const allPosts = JSON.parse(mockPostsStr) as any[];
        const updated = allPosts.map(p => {
          if (p._id === postId) {
            const liked = p.likes.includes(userId);
            const likesList = liked ? p.likes.filter((id: string) => id !== userId) : [...p.likes, userId];
            return { ...p, likes: likesList };
          }
          return p;
        });
        localStorage.setItem('mock_db_posts', JSON.stringify(updated));
        setSavedPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: updated.find(up => up._id === postId).likes } : p));
      }
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/like/${postId}`);
        setSavedPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: res.data.likes } : p));
      } catch (err) {
        console.error('Error liking post:', err);
      }
    }
  };

  // Comment on saved post
  const handleCommentSubmit = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = commentTexts[postId];
    if (!text || !text.trim() || !user) return;

    if (isMockMode) {
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const allPosts = JSON.parse(mockPostsStr) as any[];
        const newComment = {
          _id: 'c_' + Date.now(),
          text,
          user: {
            _id: user.id,
            name: user.name,
            role: user.role,
            profile: {
              avatar: user.profile?.avatar,
              company: user.profile?.company
            }
          },
          likes: [],
          replies: [],
          createdAt: new Date().toISOString()
        };

        const updated = allPosts.map(p => {
          if (p._id === postId) {
            return { ...p, comments: [...p.comments, newComment] };
          }
          return p;
        });
        localStorage.setItem('mock_db_posts', JSON.stringify(updated));
        setSavedPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: [...p.comments, newComment] } : p));
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      }
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/comment/${postId}`, { text });
        setSavedPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: res.data.comments } : p));
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      } catch (err) {
        console.error('Error commenting:', err);
      }
    }
  };

  // Like comment
  const handleCommentLike = async (postId: string, commentId: string) => {
    if (!user) return;
    const userId = user.id || (user as any)._id;
    if (isMockMode) {
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const allPosts = JSON.parse(mockPostsStr) as any[];
        const updated = allPosts.map(p => {
          if (p._id === postId) {
            const updatedComments = p.comments.map((c: any) => {
              if (c._id === commentId) {
                const commentLikes = c.likes || [];
                const liked = commentLikes.includes(userId);
                const newLikes = liked ? commentLikes.filter((id: string) => id !== userId) : [...commentLikes, userId];
                return { ...c, likes: newLikes };
              }
              return c;
            });
            return { ...p, comments: updatedComments };
          }
          return p;
        });
        localStorage.setItem('mock_db_posts', JSON.stringify(updated));
        setSavedPosts(prev => prev.map(p => {
          if (p._id === postId) {
            const updatedComments = p.comments.map((c: any) => {
              if (c._id === commentId) {
                const commentLikes = c.likes || [];
                const liked = commentLikes.includes(userId);
                const newLikes = liked ? commentLikes.filter((id: string) => id !== userId) : [...commentLikes, userId];
                return { ...c, likes: newLikes };
              }
              return c;
            });
            return { ...p, comments: updatedComments };
          }
          return p;
        }));
      }
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/comment/${postId}/${commentId}/like`);
        setSavedPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: res.data.comments } : p));
      } catch (err) {
        console.error('Error liking comment:', err);
      }
    }
  };

  // Reply to comment
  const handleReplySubmit = async (postId: string, commentId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !user) return;
    const userId = user.id || (user as any)._id;

    if (isMockMode) {
      const mockPostsStr = localStorage.getItem('mock_db_posts');
      if (mockPostsStr) {
        const allPosts = JSON.parse(mockPostsStr) as any[];
        const newReply = {
          _id: 'r_' + Date.now(),
          text: replyText,
          user: {
            _id: userId,
            name: user.name,
            role: user.role,
            profile: {
              avatar: user.profile?.avatar,
              company: user.profile?.company
            }
          },
          createdAt: new Date().toISOString()
        };

        const updated = allPosts.map(p => {
          if (p._id === postId) {
            const updatedComments = p.comments.map((c: any) => {
              if (c._id === commentId) {
                return { ...c, replies: [...(c.replies || []), newReply] };
              }
              return c;
            });
            return { ...p, comments: updatedComments };
          }
          return p;
        });
        localStorage.setItem('mock_db_posts', JSON.stringify(updated));
        setSavedPosts(prev => prev.map(p => {
          if (p._id === postId) {
            const updatedComments = p.comments.map((c: any) => {
              if (c._id === commentId) {
                return { ...c, replies: [...(c.replies || []), newReply] };
              }
              return c;
            });
            return { ...p, comments: updatedComments };
          }
          return p;
        }));
        setActiveReplyCommentId(null);
        setReplyText('');
      }
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/comment/${postId}/${commentId}/reply`, { text: replyText });
        setSavedPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: res.data.comments } : p));
        setActiveReplyCommentId(null);
        setReplyText('');
      } catch (err) {
        console.error('Error replying to comment:', err);
      }
    }
  };

  // Check if liked
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

  // Get users who liked
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

  // Role Badge Renderer
  const renderRoleBadge = (role: string) => {
    let bg = 'rgba(255, 255, 255, 0.05)';
    let color = '#ffffff';
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
        padding: '1px 5px',
        borderRadius: '3px',
        backgroundColor: bg,
        color: color,
        border: border,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginLeft: '6px',
        display: 'inline-block'
      }}>
        {text}
      </span>
    );
  };

  // Privacy Toggle Handler
  const handlePrivacyToggle = async (checked: boolean) => {
    setIsPrivate(checked);
    if (isMockMode && user) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      const currentUserStr = localStorage.getItem('mock_db_current_user');
      
      if (mockUsersStr && currentUserStr) {
        const allUsers = JSON.parse(mockUsersStr) as any[];
        const curr = JSON.parse(currentUserStr);

        const updatedUser = {
          ...curr,
          isPrivate: checked
        };

        const updatedUsersList = allUsers.map(u => u._id === user.id ? updatedUser : u);

        localStorage.setItem('mock_db_current_user', JSON.stringify(updatedUser));
        localStorage.setItem('mock_db_users', JSON.stringify(updatedUsersList));

        refreshUser();
        showNotification('Privacy Updated', `Profile is now ${checked ? 'Private' : 'Public'}.`, 'success');
      }
    } else {
      try {
        await axios.put(`${API_URL}/users/profile`, { isPrivate: checked }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('Privacy Updated', `Profile is now ${checked ? 'Private' : 'Public'}.`, 'success');
        refreshUser();
      } catch (err) {
        console.error('Error updating privacy:', err);
        showNotification('Update Failed', 'Server error updating privacy settings.', 'error');
      }
    }
  };

  const handleFileUpload = async (fileOrDataUrl: File | string, type: 'avatar' | 'cover') => {
    const uploadAsset = async (base64Data: string) => {
      const setProgress = type === 'avatar' ? setAvatarProgress : setCoverProgress;
      const setAsset = type === 'avatar' ? setAvatar : setCover;
      
      setProgress(0);
      
      try {
        if (isMockMode) {
          for (let p = 10; p <= 100; p += 15) {
            setProgress(p);
            await new Promise(r => setTimeout(r, 60));
          }
          setAsset(base64Data);
          
          const currentUserStr = localStorage.getItem('mock_db_current_user');
          const mockUsersStr = localStorage.getItem('mock_db_users');
          if (currentUserStr && mockUsersStr) {
            const curr = JSON.parse(currentUserStr);
            const allUsers = JSON.parse(mockUsersStr) as any[];
            
            const updatedUser = {
              ...curr,
              profile: {
                ...curr.profile,
                [type]: base64Data
              }
            };
            
            const updatedUsersList = allUsers.map(u => u._id === user?.id ? updatedUser : u);
            localStorage.setItem('mock_db_current_user', JSON.stringify(updatedUser));
            localStorage.setItem('mock_db_users', JSON.stringify(updatedUsersList));
            
            refreshUser();
          }

          showNotification('Mock Media Saved', `Asset loaded directly as mock base64.`, 'info');
          setProgress(null);
          return;
        }

        const payload = type === 'avatar' 
          ? { avatar: base64Data } 
          : { cover: base64Data };

        const response = await axios.put(`${API_URL}/users/profile`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || (progressEvent as any).bytesTotal || 0;
            if (total > 0) {
              const current = progressEvent.loaded;
              const percent = Math.round((current * 100) / total);
              setProgress(percent);
            }
          }
        });

        if (type === 'avatar') {
          setAvatar(response.data.profile.avatar);
        } else {
          setCover(response.data.profile.cover);
        }
        
        refreshUser();
        showNotification('Asset Saved', `${type === 'avatar' ? 'Avatar' : 'Cover'} media uploaded.`, 'success');
      } catch (err) {
        console.error(`Error uploading ${type}:`, err);
        showNotification('Upload Failed', 'There was an issue processing your media asset.', 'error');
      } finally {
        setProgress(null);
      }
    };

    if (typeof fileOrDataUrl === 'string') {
      uploadAsset(fileOrDataUrl);
    } else {
      const reader = new FileReader();
      reader.readAsDataURL(fileOrDataUrl);
      reader.onload = () => {
        uploadAsset(reader.result as string);
      };
    }
  };

  // Crop Modal States
  const [cropFileSrc, setCropFileSrc] = useState<string>('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropOffsetX, setCropOffsetX] = useState<number>(0);
  const [cropOffsetY, setCropOffsetY] = useState<number>(0);

  const handleAvatarSelect = (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setCropFileSrc(reader.result as string);
      setCropZoom(1);
      setCropOffsetX(0);
      setCropOffsetY(0);
      setIsCropModalOpen(true);
    };
  };

  const handleApplyCrop = () => {
    const img = new Image();
    img.src = cropFileSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      canvas.width = 400;
      canvas.height = 400;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 400, 400);

        const sSize = size / cropZoom;
        const maxShiftX = (img.width - sSize) / 2;
        const maxShiftY = (img.height - sSize) / 2;
        
        const sX = (img.width - sSize) / 2 + (cropOffsetX / 100) * maxShiftX;
        const sY = (img.height - sSize) / 2 + (cropOffsetY / 100) * maxShiftY;
        
        ctx.drawImage(
          img,
          Math.max(0, Math.min(sX, img.width - sSize)),
          Math.max(0, Math.min(sY, img.height - sSize)),
          sSize,
          sSize,
          0,
          0,
          400,
          400
        );

        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
        handleFileUpload(croppedBase64, 'avatar');
        setIsCropModalOpen(false);
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const skillsArray = skills
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const profileData = {
      name,
      // Flat properties for server destructuring
      avatar,
      cover,
      bio,
      department,
      batch,
      skills: skillsArray,
      company,
      jobTitle,
      gender,
      education,
      college,
      isPrivate,
      profile: {
        bio,
        avatar,
        cover,
        department,
        batch,
        skills: skillsArray,
        company,
        jobTitle,
        gender,
        education,
        college
      }
    };

    if (isMockMode && user) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      const currentUserStr = localStorage.getItem('mock_db_current_user');
      
      if (mockUsersStr && currentUserStr) {
        const allUsers = JSON.parse(mockUsersStr) as any[];
        const curr = JSON.parse(currentUserStr);

        const updatedUser = {
          ...curr,
          name,
          isPrivate,
          profile: {
            ...curr.profile,
            ...profileData.profile
          }
        };

        const updatedUsersList = allUsers.map(u => u._id === user.id ? updatedUser : u);

        localStorage.setItem('mock_db_current_user', JSON.stringify(updatedUser));
        localStorage.setItem('mock_db_users', JSON.stringify(updatedUsersList));

        refreshUser();
        showNotification('Profile Saved', 'Your details have been saved locally.', 'success');
      }
      setSaving(false);
    } else {
      try {
        await axios.put(`${API_URL}/users/profile`, profileData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('Profile Saved', 'Your profile details have been successfully synchronized.', 'success');
        refreshUser();
      } catch (err) {
        console.error('Update profile error:', err);
        showNotification('Save Failed', 'Server error updating profile details.', 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSaveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle || !expCompany || !expStartDate) {
      showNotification('Validation Error', 'Job Title, Company and Start Date are required.', 'warning');
      return;
    }

    let updatedExperiences = [...experiences];
    if (editingExpId) {
      // Update existing
      updatedExperiences = updatedExperiences.map(exp => 
        (exp._id === editingExpId || exp.id === editingExpId) 
          ? {
              ...exp,
              title: expTitle,
              company: expCompany,
              location: expLocation,
              startDate: expStartDate,
              endDate: expCurrent ? '' : expEndDate,
              current: expCurrent,
              description: expDescription
            }
          : exp
      );
    } else {
      // Add new
      const newExp = {
        _id: 'exp_' + Date.now(),
        title: expTitle,
        company: expCompany,
        location: expLocation,
        startDate: expStartDate,
        endDate: expCurrent ? '' : expEndDate,
        current: expCurrent,
        description: expDescription
      };
      updatedExperiences.push(newExp);
    }

    await persistExperiences(updatedExperiences);
    resetExpForm();
  };

  const handleDeleteExperience = async (expId: string) => {
    const updatedExperiences = experiences.filter(exp => (exp._id !== expId && exp.id !== expId));
    await persistExperiences(updatedExperiences);
  };

  const persistExperiences = async (updatedExpList: any[]) => {
    if (isMockMode && user) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      const currentUserStr = localStorage.getItem('mock_db_current_user');
      
      if (mockUsersStr && currentUserStr) {
        const allUsers = JSON.parse(mockUsersStr) as any[];
        const curr = JSON.parse(currentUserStr);

        const updatedUser = {
          ...curr,
          profile: {
            ...curr.profile,
            experience: updatedExpList
          }
        };

        const updatedUsersList = allUsers.map(u => u._id === user.id ? updatedUser : u);

        localStorage.setItem('mock_db_current_user', JSON.stringify(updatedUser));
        localStorage.setItem('mock_db_users', JSON.stringify(updatedUsersList));

        refreshUser();
        showNotification('Experience Saved', 'Work experience logs updated locally.', 'success');
      }
    } else {
      try {
        await axios.put(`${API_URL}/users/profile`, { experience: updatedExpList }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('Experience Saved', 'Work experience successfully saved to server.', 'success');
        refreshUser();
      } catch (err) {
        console.error('Error updating experience:', err);
        showNotification('Save Failed', 'Server error saving experience timeline.', 'error');
      }
    }
  };

  const handleEditExpClick = (exp: any) => {
    const expId = exp._id || exp.id;
    setEditingExpId(expId);
    setExpTitle(exp.title || '');
    setExpCompany(exp.company || '');
    setExpLocation(exp.location || '');
    setExpStartDate(exp.startDate || '');
    setExpEndDate(exp.endDate || '');
    setExpCurrent(exp.current || false);
    setExpDescription(exp.description || '');
    setShowExpForm(true);
  };

  const resetExpForm = () => {
    setEditingExpId(null);
    setExpTitle('');
    setExpCompany('');
    setExpLocation('');
    setExpStartDate('');
    setExpEndDate('');
    setExpCurrent(false);
    setExpDescription('');
    setShowExpForm(false);
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)', maxWidth: '800px' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-title)' }}>
          Settings
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', marginTop: '4px' }}>
          Customize your public profile card, view bookmarked posts, and toggle account visibility options.
        </p>
      </div>

      {/* Tabs Menu */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        borderBottom: '1px solid var(--color-border-glass)', 
        marginBottom: '28px', 
        paddingBottom: '4px',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('basics')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'basics' ? '2.5px solid var(--color-yellow-primary)' : '2.5px solid transparent',
            color: activeTab === 'basics' ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FiUser size={16} />
          Profile Basics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('experience')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'experience' ? '2.5px solid var(--color-yellow-primary)' : '2.5px solid transparent',
            color: activeTab === 'experience' ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FiBriefcase size={16} />
          Work Experience ({experiences.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'saved' ? '2.5px solid var(--color-yellow-primary)' : '2.5px solid transparent',
            color: activeTab === 'saved' ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FiBookmark size={16} />
          Saved Posts ({user?.savedPosts?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('privacy')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'privacy' ? '2.5px solid var(--color-yellow-primary)' : '2.5px solid transparent',
            color: activeTab === 'privacy' ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FiSliders size={16} />
          Privacy Settings
        </button>
      </div>

      {/* Tabs Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'basics' && (
          <motion.div
            key="basics-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Core Profile Details */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderColor: 'rgba(255, 215, 0, 0.08)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-yellow-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FiUser /> Profile Basics
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="settings-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2', position: 'relative' }}>
                    <label className="form-label">Department</label>
                    <select
                      required={!isOtherDept}
                      value={isOtherDept ? 'Others' : department}
                      onChange={(e) => {
                        if (e.target.value === 'Others') {
                          setIsOtherDept(true);
                          setDepartment('');
                        } else {
                          setIsOtherDept(false);
                          setDepartment(e.target.value);
                        }
                      }}
                      className="form-input"
                    >
                      <option value="" disabled>Select your department</option>
                      {DEPARTMENTS_LIST.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                      <option value="Others">Others (Type your own)</option>
                    </select>

                    {isOtherDept && (
                      <div style={{ marginTop: '12px' }}>
                        <input
                          type="text"
                          required
                          placeholder="Enter your custom department..."
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="form-input"
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-group settings-span" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Biography / Summary</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      placeholder="Share a brief overview of your academic or professional journey..."
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(10,10,10,0.7)',
                        border: '1px solid var(--color-border-glass)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        outline: 'none',
                        resize: 'none',
                        fontSize: '14px',
                        fontFamily: 'var(--font-body)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Media Assets Upload */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderColor: 'rgba(255, 215, 0, 0.08)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-yellow-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FiImage /> Media Assets
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="settings-grid">
                  
                  {/* Avatar Upload */}
                  <div className="form-group">
                    <label className="form-label">Profile Avatar</label>
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleAvatarSelect(e.dataTransfer.files[0]);
                        }
                      }}
                      style={{
                        height: '140px',
                        borderRadius: '16px',
                        border: '2px dashed rgba(255, 215, 0, 0.25)',
                        background: 'rgba(10,10,10,0.6)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-yellow-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.25)'}
                      onClick={() => document.getElementById('avatar-input')?.click()}
                    >
                      <input 
                        type="file" 
                        id="avatar-input" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleAvatarSelect(e.target.files[0]);
                          }
                        }}
                      />
                      {avatar ? (
                        <img 
                          src={avatar} 
                          alt="Avatar Preview" 
                          style={{
                            width: '74px',
                            height: '74px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            objectPosition: 'top center',
                            border: '2px solid var(--color-yellow-primary)',
                            boxShadow: '0 0 10px rgba(255, 215, 0, 0.2)',
                            marginBottom: '8px'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '74px',
                          height: '74px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '8px',
                          color: 'var(--color-text-muted)'
                        }}>
                          <FiUser size={30} />
                        </div>
                      )}
                      
                      <span style={{ fontSize: '12px', color: 'var(--color-text-gray)', fontWeight: 500 }}>
                        Drag & Drop or Click to Upload
                      </span>
                      
                      {avatarProgress !== null && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.85)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 16px',
                          zIndex: 10
                        }}>
                          <span style={{ fontSize: '13px', color: 'var(--color-yellow-primary)', fontWeight: 700, marginBottom: '6px' }}>
                            Uploading {avatarProgress}%
                          </span>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${avatarProgress}%`, height: '100%', background: 'var(--color-yellow-primary)', transition: 'width 0.1s ease' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cover Upload */}
                  <div className="form-group">
                    <label className="form-label">Cover Banner</label>
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileUpload(e.dataTransfer.files[0], 'cover');
                        }
                      }}
                      style={{
                        height: '140px',
                        borderRadius: '16px',
                        border: '2px dashed rgba(255, 215, 0, 0.25)',
                        background: 'rgba(10,10,10,0.6)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-yellow-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.25)'}
                      onClick={() => document.getElementById('cover-input')?.click()}
                    >
                      <input 
                        type="file" 
                        id="cover-input" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0], 'cover');
                          }
                        }}
                      />
                      {cover ? (
                        <div style={{
                          width: '120px',
                          height: '60px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255, 215, 0, 0.3)',
                          marginBottom: '8px'
                        }}>
                          <img 
                            src={cover} 
                            alt="Cover Preview" 
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          width: '120px',
                          height: '60px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '8px',
                          color: 'var(--color-text-muted)'
                        }}>
                          <FiImage size={24} />
                        </div>
                      )}
                      
                      <span style={{ fontSize: '12px', color: 'var(--color-text-gray)', fontWeight: 500 }}>
                        Drag & Drop or Click to Upload
                      </span>
                      
                      {coverProgress !== null && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.85)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 16px',
                          zIndex: 10
                        }}>
                          <span style={{ fontSize: '13px', color: 'var(--color-yellow-primary)', fontWeight: 700, marginBottom: '6px' }}>
                            Uploading {coverProgress}%
                          </span>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${coverProgress}%`, height: '100%', background: 'var(--color-yellow-primary)', transition: 'width 0.1s ease' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Academic & Professional details */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderColor: 'rgba(255, 215, 0, 0.08)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-yellow-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FiBriefcase /> Academic & Careers
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="settings-grid">
                  <div className="form-group">
                    <label className="form-label">Batch Years</label>
                    <input
                      type="text"
                      placeholder="e.g. 2016-2020"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Highest Education</label>
                    <input
                      type="text"
                      placeholder="e.g. B.E. Computer Science, MBA"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">College / University</label>
                    <input
                      type="text"
                      placeholder="e.g. CEG, Anna University"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Skills (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="React, Node.js, Python, Figma"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Current Company / Organization</label>
                    <input
                      type="text"
                      placeholder="e.g. Google, Student"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Job Title / Role</label>
                    <input
                      type="text"
                      placeholder="e.g. Software Engineer, Intern"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{
                    padding: '12px 30px',
                    fontSize: '15px',
                    gap: '8px'
                  }}
                >
                  <FiSave /> {saving ? 'Saving changes...' : 'Save Profile Details'}
                </button>
              </div>

            </form>
          </motion.div>
        )}

        {activeTab === 'saved' && (
          <motion.div
            key="saved-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {loadingSaved ? (
              <div style={{ color: 'var(--color-text-gray)', fontSize: '14px', padding: '20px 0' }}>
                Loading saved posts...
              </div>
            ) : savedPosts.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-gray)', borderColor: 'rgba(255,215,0,0.06)' }}>
                <FiBookmark size={36} style={{ color: 'var(--color-text-muted)', marginBottom: '12px' }} />
                <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: '0 0 6px 0' }}>No Saved Posts</h4>
                <p style={{ fontSize: '13px', margin: 0 }}>Posts you save from the dashboard will be cataloged here for direct viewing.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {savedPosts.map((post) => {
                  const isLiked = checkIsLiked(post.likes);
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
                      {/* Post Header */}
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
                              style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}
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
                      </div>

                      {/* Caption */}
                      <p style={{ fontSize: '14px', color: '#e0e0e0', lineHeight: '1.6', margin: 0 }}>
                        {post.caption}
                      </p>

                      {/* Post Image */}
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

                      {/* Stats */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                        borderBottom: '1px solid var(--color-border-glass)',
                        paddingBottom: '10px'
                      }}>
                        <span 
                          onClick={() => setShowWhoLikedPostId(post._id)}
                          style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-yellow-primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                        >
                          {post.likes.length} {post.likes.length === 1 ? 'Like' : 'Likes'}
                        </span>
                        <span>{post.comments.length} Comments</span>
                      </div>

                      {/* Actions */}
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
                          onClick={() => handleSaveToggle(post._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-yellow-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: 500
                          }}
                        >
                          <FiBookmark fill="var(--color-yellow-primary)" size={18} />
                          <span>Saved</span>
                        </button>
                      </div>

                      {/* Comments Area */}
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
                            {/* Comments list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto' }}>
                              {post.comments.map((comment, index) => {
                                const commentLikes = comment.likes || [];
                                const commentReplies = comment.replies || [];
                                const isCommentLiked = user ? commentLikes.includes(user.id) || commentLikes.includes((user as any)._id) : false;

                                return (
                                  <div key={comment._id || index} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13.5px' }}>
                                      <div 
                                        onClick={() => setSelectedPreviewUserId(comment.user?._id || (comment.user as any)?.id)} 
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <img
                                          src={comment.user?.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
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
                                              style={{ cursor: 'pointer' }}
                                            >
                                              <h5 style={{ fontWeight: 700, color: 'var(--color-yellow-primary)', margin: 0 }}>{comment.user?.name}</h5>
                                            </span>
                                            {comment.user?.profile?.company && (
                                              <span style={{ fontSize: '10px', color: 'var(--color-text-gray)' }}>
                                                • {comment.user.profile.company}
                                              </span>
                                            )}
                                          </div>
                                          <p style={{ color: '#e0e0e0', marginTop: '2px', margin: 0, wordBreak: 'break-word', lineHeight: 1.5 }}>{comment.text}</p>
                                        </div>

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

                                    {/* Replies */}
                                    {commentReplies.length > 0 && (
                                      <div style={{ paddingLeft: '36px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                                        {commentReplies.map((reply, rIdx) => (
                                          <div key={reply._id || rIdx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '12.5px' }}>
                                            <div 
                                              onClick={() => setSelectedPreviewUserId(reply.user?._id || (reply.user as any)?.id)} 
                                              style={{ cursor: 'pointer' }}
                                            >
                                              <img
                                                src={reply.user?.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
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
                                                    style={{ cursor: 'pointer' }}
                                                  >
                                                    <h6 style={{ fontWeight: 700, color: 'var(--color-yellow-primary)', margin: 0 }}>{reply.user?.name}</h6>
                                                  </span>
                                                  {reply.user?.profile?.company && (
                                                    <span style={{ fontSize: '10.5px', color: 'var(--color-text-gray)' }}>
                                                      • {reply.user.profile.company}
                                                    </span>
                                                  )}
                                                </div>
                                                <p style={{ color: '#d0d0d0', margin: 0, wordBreak: 'break-word', lineHeight: 1.5 }}>{reply.text}</p>
                                              </div>
                                              <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '2px', paddingLeft: '2px' }}>
                                                {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Just now'}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Nested Reply Form */}
                                    {activeReplyCommentId === comment._id && (
                                      <form 
                                        onSubmit={(e) => handleReplySubmit(post._id, comment._id, e)}
                                        style={{ paddingLeft: '36px', display: 'flex', gap: '6px', marginTop: '2px' }}
                                      >
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
                                            padding: '6px 12px',
                                            color: '#ffffff',
                                            fontSize: '12.5px',
                                            outline: 'none'
                                          }}
                                          autoFocus
                                        />
                                        <button 
                                          type="submit" 
                                          className="btn-primary" 
                                          style={{ padding: '6px 14px', fontSize: '11px', borderRadius: '6px' }}
                                        >
                                          Reply
                                        </button>
                                      </form>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Main Comment Input */}
                            <form 
                              onSubmit={(e) => handleCommentSubmit(post._id, e)}
                              style={{ display: 'flex', gap: '10px', marginTop: '4px' }}
                            >
                              <input
                                type="text"
                                placeholder="Add a comment..."
                                value={commentTexts[post._id] || ''}
                                onChange={(e) => setCommentTexts({ ...commentTexts, [post._id]: e.target.value })}
                                style={{
                                  flex: 1,
                                  background: 'rgba(10,10,10,0.7)',
                                  border: '1px solid var(--color-border-glass)',
                                  borderRadius: '8px',
                                  padding: '10px 16px',
                                  color: '#ffffff',
                                  fontSize: '12.5px',
                                  outline: 'none'
                                }}
                              />
                              <button 
                                type="submit" 
                                className="btn-primary" 
                                style={{ padding: '10px 20px', fontSize: '13px' }}
                              >
                                Post
                              </button>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'experience' && (
          <motion.div
            key="experience-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {/* Experience List Header & Add Button */}
            <div className="glass-panel" style={{ padding: '24px', borderColor: 'rgba(255,215,0,0.08)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-yellow-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <FiBriefcase /> Career Timeline
                </h3>
                {!showExpForm && (
                  <button
                    type="button"
                    onClick={() => {
                      resetExpForm();
                      setShowExpForm(true);
                    }}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Add Experience
                  </button>
                )}
              </div>

              {/* Form to Add/Edit Experience */}
              {showExpForm && (
                <form onSubmit={handleSaveExperience} style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--color-border-glass)', paddingTop: '20px', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: '0 0 10px 0' }}>
                    {editingExpId ? 'Edit Work Experience' : 'Add Work Experience'}
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="settings-grid">
                    <div className="form-group">
                      <label className="form-label">Job Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Senior Software Engineer"
                        value={expTitle}
                        onChange={(e) => setExpTitle(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Company *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Google"
                        value={expCompany}
                        onChange={(e) => setExpCompany(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Chennai, India"
                        value={expLocation}
                        onChange={(e) => setExpLocation(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Start Date *</label>
                      <input
                        type="month"
                        required
                        value={expStartDate}
                        onChange={(e) => setExpStartDate(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', color: '#e0e0e0' }}>
                        <input
                          type="checkbox"
                          checked={expCurrent}
                          onChange={(e) => setExpCurrent(e.target.checked)}
                          style={{ accentColor: 'var(--color-yellow-primary)', width: '16px', height: '16px' }}
                        />
                        I currently work in this role
                      </label>
                    </div>

                    {!expCurrent && (
                      <div className="form-group">
                        <label className="form-label">End Date</label>
                        <input
                          type="month"
                          required={!expCurrent}
                          value={expEndDate}
                          onChange={(e) => setExpEndDate(e.target.value)}
                          className="form-input"
                        />
                      </div>
                    )}

                    <div className="form-group settings-span" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Description</label>
                      <textarea
                        placeholder="Describe your responsibilities, projects, or achievements..."
                        value={expDescription}
                        onChange={(e) => setExpDescription(e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'rgba(10,10,10,0.7)',
                          border: '1px solid var(--color-border-glass)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          outline: 'none',
                          resize: 'none',
                          fontSize: '14px',
                          fontFamily: 'var(--font-body)'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={resetExpForm}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--color-border-glass)',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        color: '#ffffff',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ padding: '10px 24px', fontSize: '13.5px' }}
                    >
                      {editingExpId ? 'Save Changes' : 'Add Role'}
                    </button>
                  </div>
                </form>
              )}

              {/* Experience list rendering */}
              {!showExpForm && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {experiences.length === 0 ? (
                    <p style={{ color: 'var(--color-text-gray)', fontSize: '13px', margin: 0 }}>
                      No work experiences listed yet. Add your professional history to showcase on your profile.
                    </p>
                  ) : (
                    experiences.map((exp, idx) => {
                      const expId = exp._id || exp.id;
                      const dateRange = `${exp.startDate ? new Date(exp.startDate).toLocaleDateString([], { year: 'numeric', month: 'short' }) : ''} - ${exp.current ? 'Present' : exp.endDate ? new Date(exp.endDate).toLocaleDateString([], { year: 'numeric', month: 'short' }) : ''}`;

                      return (
                        <div
                          key={expId || idx}
                          style={{
                            padding: '16px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--color-border-glass)',
                            borderRadius: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '16px'
                          }}
                        >
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'rgba(255, 215, 0, 0.1)',
                                border: '1px solid rgba(255, 215, 0, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-yellow-primary)',
                                flexShrink: 0
                              }}
                            >
                              <FiBriefcase size={18} />
                            </div>
                            <div>
                              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: '0 0 2px 0' }}>
                                {exp.title}
                              </h4>
                              <p style={{ fontSize: '13px', color: 'var(--color-yellow-primary)', fontWeight: 500, margin: '0 0 4px 0' }}>
                                {exp.company} {exp.location ? `• ${exp.location}` : ''}
                              </p>
                              <p style={{ fontSize: '11.5px', color: 'var(--color-text-gray)', margin: '0 0 8px 0' }}>
                                {dateRange}
                              </p>
                              {exp.description && (
                                <p style={{ fontSize: '13px', color: '#d0d0d0', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                  {exp.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleEditExpClick(exp)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-text-gray)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'inline-flex',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-yellow-primary)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-gray)'}
                              title="Edit"
                            >
                              <FiEdit3 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExperience(expId)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-text-gray)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'inline-flex',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = '#ff6666'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-gray)'}
                              title="Delete"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'privacy' && (
          <motion.div
            key="privacy-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="glass-panel"
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', borderColor: 'rgba(255,215,0,0.08)' }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-yellow-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <FiLock /> Profile Privacy
            </h3>
            
            <p style={{ color: 'var(--color-text-gray)', fontSize: '13.5px', lineHeight: '1.6', margin: 0 }}>
              Adjust who can see your details. Setting your profile to Private protects your personal data from individuals you are not connected with.
            </p>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px', 
              background: 'rgba(255,255,255,0.02)', 
              borderRadius: '12px',
              border: '1px solid var(--color-border-glass)',
              marginTop: '8px'
            }}>
              <div>
                <h4 style={{ color: '#ffffff', fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isPrivate ? <FiLock style={{ color: 'var(--color-yellow-primary)' }} /> : <FiUnlock style={{ color: 'var(--color-text-muted)' }} />}
                  Private Account Mode
                </h4>
                <p style={{ color: 'var(--color-text-gray)', fontSize: '12.5px', margin: 0, maxWidth: '540px' }}>
                  When enabled, non-connections will see a locked screen when visiting your profile. They will not be able to view your biography, skills catalog, academic details, batch, employment logs, or recent posts.
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => handlePrivacyToggle(!isPrivate)}
                style={{
                  width: '56px',
                  height: '28px',
                  borderRadius: '14px',
                  background: isPrivate ? 'var(--color-yellow-primary)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.25s ease',
                  padding: 0,
                  boxShadow: isPrivate ? '0 0 12px rgba(255, 215, 0, 0.3)' : 'none',
                  flexShrink: 0
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: isPrivate ? '#000000' : '#ffffff',
                  position: 'absolute',
                  top: '3px',
                  left: isPrivate ? '31px' : '3px',
                  transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </button>
            </div>

            <div style={{ marginTop: '12px', padding: '14px', borderRadius: '8px', background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.15)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <FiInfo style={{ color: 'var(--color-yellow-primary)', flexShrink: 0, marginTop: '2px' }} size={16} />
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-gray)', lineHeight: '1.5' }}>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>Note:</span> Administrators can always view user profiles for verification and reporting purposes. Connection requests can still be sent to you by other scholars or alumni.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crop Modal */}
      {isCropModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            borderColor: 'rgba(255,215,0,0.15)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)', margin: 0 }}>
              Adjust Profile Avatar
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-gray)', margin: 0 }}>
              Drag the sliders below to center your face and adjust the framing before uploading.
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '10px 0'
            }}>
              <div style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                overflow: 'hidden',
                position: 'relative',
                border: '3px solid var(--color-yellow-primary)',
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.25)',
                background: '#000000'
              }}>
                <img
                  src={cropFileSrc}
                  alt="Crop Target"
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `scale(${cropZoom}) translate(${cropOffsetX}%, ${cropOffsetY}%)`,
                    transition: 'transform 0.05s ease-out'
                  }}
                />
              </div>
            </div>

            {/* Zoom Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 500, color: '#e0e0e0' }}>
                <span>Zoom Level</span>
                <span style={{ color: 'var(--color-yellow-primary)' }}>{cropZoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={cropZoom}
                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--color-yellow-primary)',
                  background: 'rgba(255,255,255,0.1)',
                  height: '6px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Horizontal Offset Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 500, color: '#e0e0e0' }}>
                <span>Horizontal Offset</span>
                <span style={{ color: 'var(--color-yellow-primary)' }}>{cropOffsetX > 0 ? `+${cropOffsetX}` : cropOffsetX}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={cropOffsetX}
                onChange={(e) => setCropOffsetX(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--color-yellow-primary)',
                  background: 'rgba(255,255,255,0.1)',
                  height: '6px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Vertical Offset Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 500, color: '#e0e0e0' }}>
                <span>Vertical Offset</span>
                <span style={{ color: 'var(--color-yellow-primary)' }}>{cropOffsetY > 0 ? `+${cropOffsetY}` : cropOffsetY}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={cropOffsetY}
                onChange={(e) => setCropOffsetY(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--color-yellow-primary)',
                  background: 'rgba(255,255,255,0.1)',
                  height: '6px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border-glass)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                style={{
                  flex: 1,
                  background: 'var(--color-yellow-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#000000',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User profile preview popup */}
      {selectedPreviewUserId && (
        <UserProfilePopup 
          userId={selectedPreviewUserId} 
          onClose={() => setSelectedPreviewUserId(null)} 
        />
      )}

      {/* Who Liked Modal */}
      <AnimatePresence>
        {showWhoLikedPostId && (() => {
          const post = savedPosts.find(p => p._id === showWhoLikedPostId);
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
                            src={u.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
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

      <style>{`
        @media (max-width: 600px) {
          .settings-grid {
            grid-template-columns: 1fr !important;
          }
          .settings-span {
            grid-column: span 1 !important;
          }
        }
      `}</style>

    </div>
  );
};

export default Settings;
