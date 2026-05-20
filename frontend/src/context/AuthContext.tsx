import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useNotification } from './NotificationContext';

export interface UserProfile {
  avatar: string;
  cover: string;
  bio: string;
  skills: string[];
  department: string;
  batch: string;
  company: string;
  jobTitle: string;
  socialLinks: {
    linkedin: string;
    github: string;
    twitter: string;
    website: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student' | 'alumni';
  isVerified: boolean;
  profile: UserProfile;
  connections: string[];
  savedPosts: string[];
}

interface AuthContextProps {
  user: User | null;
  token: string | null;
  loading: boolean;
  isMockMode: boolean;
  login: (email: string, password: string, role: User['role'], secretAdminCode?: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: User['role'], secretAdminCode?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<User>;
  toggleConnect: (targetUserId: string) => Promise<boolean>;
  toggleSavePost: (postId: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  setMockMode: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const API_URL = 'http://localhost:5000/api';

// Set default auth token in axios headers
const setAuthToken = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);
  const { showNotification } = useNotification();

  // Load initial token & user
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('maatram_token');
      const storedUser = localStorage.getItem('maatram_user');
      const mode = localStorage.getItem('maatram_mock_mode') === 'true';

      setIsMockMode(mode);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setAuthToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        if (!mode) {
          // Verify with server
          try {
            const res = await axios.get(`${API_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            const fetchedUser = res.data;
            if (fetchedUser._id && !fetchedUser.id) {
              fetchedUser.id = fetchedUser._id;
            }
            setUser(fetchedUser);
            localStorage.setItem('maatram_user', JSON.stringify(fetchedUser));
          } catch (err) {
            console.warn('Server auth verification failed, using cached user details.', err);
            // If server is offline, keep using cached session but note fallback
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Set mock mode helper
  const setMockMode = (val: boolean) => {
    setIsMockMode(val);
    localStorage.setItem('maatram_mock_mode', String(val));
  };

  // Helper: Seed mock user data for standalone client test if API is down
  const getMockUsers = (): User[] => {
    const existing = localStorage.getItem('mock_db_users');
    if (existing) return JSON.parse(existing);

    // Seed mock database
    const seed: User[] = [
      {
        id: 'admin-1',
        name: 'Maatram Admin Office',
        email: 'admin@maatram.org',
        role: 'admin',
        isVerified: true,
        profile: {
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
          cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
          bio: 'Administrative operations office of Maatram Foundation. Managing scholarships and alumni activities.',
          skills: ['Management', 'Public Policy', 'Social Welfare'],
          department: 'Foundation Board',
          batch: 'Founders',
          company: 'Maatram Foundation',
          jobTitle: 'Chief Coordinator',
          socialLinks: { linkedin: '#', github: '#', twitter: '#', website: 'https://maatramfoundation.org' }
        },
        connections: ['alumni-1', 'student-1'],
        savedPosts: []
      },
      {
        id: 'alumni-1',
        name: 'Arjun Ramachandran',
        email: 'arjun@work.com',
        role: 'alumni',
        isVerified: true,
        profile: {
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
          bio: 'Software Engineer at Google. Proud Maatram Scholar batch of 2019. Keen on mentoring and guiding juniors.',
          skills: ['React', 'TypeScript', 'Node.js', 'System Design'],
          department: 'Computer Science',
          batch: '2015-2019',
          company: 'Google',
          jobTitle: 'Software Engineer II',
          socialLinks: { linkedin: '#', github: '#', twitter: '#', website: '#' }
        },
        connections: ['student-1', 'admin-1'],
        savedPosts: []
      },
      {
        id: 'alumni-2',
        name: 'Priya Narayanan',
        email: 'priya@ux.com',
        role: 'alumni',
        isVerified: true,
        profile: {
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          cover: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800',
          bio: 'Lead Product Designer shaping the next generation of fintech applications at TechNova. Mentoring students.',
          skills: ['UI/UX Design', 'Framer Motion', 'Figma', 'Prototyping'],
          department: 'Information Technology',
          batch: '2016-2020',
          company: 'TechNova',
          jobTitle: 'Lead Product Designer',
          socialLinks: { linkedin: '#', github: '#', twitter: '#', website: '#' }
        },
        connections: [],
        savedPosts: []
      },
      {
        id: 'student-1',
        name: 'Siddharth Kumar',
        email: 'siddharth@college.edu',
        role: 'student',
        isVerified: true,
        profile: {
          avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
          cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
          bio: 'Undergraduate student seeking web development opportunities. Passionate about software engineering.',
          skills: ['JavaScript', 'HTML/CSS', 'Python'],
          department: 'Computer Science',
          batch: '2023-2027',
          company: 'College Student',
          jobTitle: 'Intern',
          socialLinks: { linkedin: '#', github: '#', twitter: '#', website: '#' }
        },
        connections: ['alumni-1', 'admin-1'],
        savedPosts: []
      }
    ];
    localStorage.setItem('mock_db_users', JSON.stringify(seed));
    return seed;
  };

  // Login Dispatch
  const login = async (email: string, password: string, role: User['role'], secretAdminCode?: string) => {
    setLoading(true);
    try {
      // Attempt API login first
      const res = await axios.post(`${API_URL}/auth/login`, { email, password, role, secretAdminCode });
      const { token: userToken, user: userData } = res.data;
      
      setToken(userToken);
      setUser(userData);
      setAuthToken(userToken);
      setMockMode(false);
      localStorage.setItem('maatram_token', userToken);
      localStorage.setItem('maatram_user', JSON.stringify(userData));

      showNotification('Welcome back', `Logged in successfully as ${userData.name}!`, 'success');
    } catch (err: any) {
      console.warn('API login failed, attempting mock mode check.', err);

      // Check if user is logging in offline using seeded users
      const mockUsers = getMockUsers();
      const matched = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role);

      if (matched) {
        if (role === 'admin' && secretAdminCode !== '25112006') {
          showNotification('Access Denied', 'Invalid Secret Admin Code.', 'error');
          setLoading(false);
          throw new Error('Invalid Secret Admin Code');
        }
        
        // Simple mock authentication success
        const dummyToken = 'mock_jwt_token_for_' + matched.id;
        setToken(dummyToken);
        setUser(matched);
        setAuthToken(dummyToken);
        setMockMode(true);
        localStorage.setItem('maatram_token', dummyToken);
        localStorage.setItem('maatram_user', JSON.stringify(matched));

        showNotification('Local Access Granted', `Connected locally as ${matched.name}. (Offline mode)`, 'success');
      } else {
        const errorMsg = err.response?.data?.message || 'Invalid credentials or connection error.';
        showNotification('Login Failed', errorMsg, 'error');
        setLoading(false);
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };

  // Register Dispatch
  const register = async (name: string, email: string, password: string, role: User['role'], secretAdminCode?: string) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/register`, { name, email, password, role, secretAdminCode });
      const { token: userToken, user: userData } = res.data;

      setToken(userToken);
      setUser(userData);
      setAuthToken(userToken);
      setMockMode(false);
      localStorage.setItem('maatram_token', userToken);
      localStorage.setItem('maatram_user', JSON.stringify(userData));

      if (role === 'alumni') {
        showNotification('Registration Pending', 'Your alumni account has been registered. An admin must verify your profile before full access.', 'warning');
      } else {
        showNotification('Account Created', `Welcome to Maatram, ${userData.name}!`, 'success');
      }
    } catch (err: any) {
      console.warn('API registration failed, fallback to local storage mock signup.', err);

      // Check if user already exists in mock DB
      const mockUsers = getMockUsers();
      if (mockUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        showNotification('Signup Failed', 'An account with this email already exists.', 'error');
        setLoading(false);
        throw new Error('Email exists');
      }

      if (role === 'admin' && secretAdminCode !== '25112006') {
        showNotification('Access Denied', 'Invalid Secret Admin Code.', 'error');
        setLoading(false);
        throw new Error('Invalid Secret Admin Code');
      }

      // Create local user
      const isVerified = role !== 'alumni';
      const newMockUser: User = {
        id: 'user_' + Date.now(),
        name,
        email,
        role,
        isVerified,
        profile: {
          avatar: '',
          cover: '',
          bio: '',
          skills: [],
          department: '',
          batch: '',
          company: '',
          jobTitle: '',
          socialLinks: { linkedin: '', github: '', twitter: '', website: '' }
        },
        connections: [],
        savedPosts: []
      };

      mockUsers.push(newMockUser);
      localStorage.setItem('mock_db_users', JSON.stringify(mockUsers));

      const dummyToken = 'mock_jwt_token_for_' + newMockUser.id;
      setToken(dummyToken);
      setUser(newMockUser);
      setAuthToken(dummyToken);
      setMockMode(true);
      localStorage.setItem('maatram_token', dummyToken);
      localStorage.setItem('maatram_user', JSON.stringify(newMockUser));

      if (role === 'alumni') {
        showNotification('Local Verification Required', 'Alumni registration successful. (Offline mode: Toggle verification in Admin Panel)', 'warning');
      } else {
        showNotification('Account Created', `Welcome to Maatram, ${newMockUser.name}! (Offline mode)`, 'success');
      }
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('maatram_token');
    localStorage.removeItem('maatram_user');
    showNotification('Logged Out', 'You have been safely signed out.', 'success');
  };

  // Update User Profile
  const updateProfile = async (profileData: Partial<UserProfile>): Promise<User> => {
    if (!user) throw new Error('Not authenticated');

    if (isMockMode) {
      const updatedUser: User = {
        ...user,
        profile: {
          ...user.profile,
          ...profileData,
          skills: profileData.skills !== undefined ? (
            Array.isArray(profileData.skills) 
              ? profileData.skills 
              : String(profileData.skills).split(',').map(s => s.trim()).filter(Boolean)
          ) : user.profile.skills
        }
      };

      setUser(updatedUser);
      localStorage.setItem('maatram_user', JSON.stringify(updatedUser));

      // Update mock db list
      const mockUsers = getMockUsers();
      const index = mockUsers.findIndex(u => u.id === user.id);
      if (index > -1) {
        mockUsers[index] = updatedUser;
        localStorage.setItem('mock_db_users', JSON.stringify(mockUsers));
      }

      showNotification('Profile Updated', 'Your profile details have been saved successfully.', 'success');
      return updatedUser;
    } else {
      try {
        const res = await axios.put(`${API_URL}/users/profile`, profileData);
        setUser(res.data);
        localStorage.setItem('maatram_user', JSON.stringify(res.data));
        showNotification('Profile Updated', 'Your profile details have been saved successfully.', 'success');
        return res.data;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Error updating profile details.';
        showNotification('Error', errorMsg, 'error');
        throw err;
      }
    }
  };

  // Connect / Disconnect with another user
  const toggleConnect = async (targetUserId: string): Promise<boolean> => {
    if (!user) return false;

    if (isMockMode) {
      const mockUsers = getMockUsers();
      const currentIdx = mockUsers.findIndex(u => u.id === user.id);
      const targetIdx = mockUsers.findIndex(u => u.id === targetUserId);

      if (currentIdx === -1 || targetIdx === -1) return false;

      const currentUser = mockUsers[currentIdx];
      const targetUser = mockUsers[targetIdx];

      const isConnected = currentUser.connections.includes(targetUserId);
      let updatedConnected = false;

      if (isConnected) {
        currentUser.connections = currentUser.connections.filter(id => id !== targetUserId);
        targetUser.connections = targetUser.connections.filter(id => id !== user.id);
        updatedConnected = false;
        showNotification('Disconnected', `You removed connection with ${targetUser.name}.`, 'info');
      } else {
        currentUser.connections.push(targetUserId);
        targetUser.connections.push(user.id);
        updatedConnected = true;
        showNotification('Connected', `You are now connected with ${targetUser.name}!`, 'success');
      }

      // Save states
      setUser({ ...currentUser });
      localStorage.setItem('maatram_user', JSON.stringify(currentUser));
      localStorage.setItem('mock_db_users', JSON.stringify(mockUsers));

      return updatedConnected;
    } else {
      try {
        const res = await axios.post(`${API_URL}/users/connect/${targetUserId}`);
        // Refresh local user to sync connections
        await refreshUser();
        return res.data.connected;
      } catch (err) {
        console.error('Error connecting:', err);
        return false;
      }
    }
  };

  // Toggle Save Post
  const toggleSavePost = async (postId: string): Promise<boolean> => {
    if (!user) return false;

    if (isMockMode) {
      const mockUsers = getMockUsers();
      const currentIdx = mockUsers.findIndex(u => u.id === user.id);
      if (currentIdx === -1) return false;

      const currentUser = mockUsers[currentIdx];
      const savedIdx = currentUser.savedPosts.indexOf(postId);
      let saved = false;

      if (savedIdx > -1) {
        currentUser.savedPosts.splice(savedIdx, 1);
        saved = false;
        showNotification('Post Unsaved', 'Post removed from your bookmarks.', 'info');
      } else {
        currentUser.savedPosts.push(postId);
        saved = true;
        showNotification('Post Saved', 'Post added to your saved list.', 'success');
      }

      setUser({ ...currentUser });
      localStorage.setItem('maatram_user', JSON.stringify(currentUser));
      localStorage.setItem('mock_db_users', JSON.stringify(mockUsers));

      return saved;
    } else {
      try {
        const res = await axios.post(`${API_URL}/posts/save/${postId}`);
        await refreshUser();
        return res.data.saved;
      } catch (err) {
        console.error('Error saving post:', err);
        return false;
      }
    }
  };

  // Sync state
  const refreshUser = async () => {
    const storedToken = localStorage.getItem('maatram_token');
    if (!storedToken || isMockMode) return;

    try {
      const res = await axios.get(`${API_URL}/auth/me`);
      setUser(res.data);
      localStorage.setItem('maatram_user', JSON.stringify(res.data));
    } catch (err) {
      console.error('Failed to sync user', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isMockMode,
        login,
        register,
        logout,
        updateProfile,
        toggleConnect,
        toggleSavePost,
        refreshUser,
        setMockMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
