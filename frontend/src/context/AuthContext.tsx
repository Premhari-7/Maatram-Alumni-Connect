import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useNotification } from './NotificationContext';

export interface Experience {
  _id?: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface UserProfile {
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
  socialLinks: {
    linkedin: string;
    github: string;
    twitter: string;
    website: string;
  };
  experience?: Experience[];
}

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'admin' | 'student' | 'alumni';
  profile: UserProfile;
  connections: string[];
  savedPosts: string[];
  reposts?: string[];
  isPrivate?: boolean;
}

interface AuthContextProps {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, role: User['role'], secretAdminCode?: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: User['role'], secretAdminCode?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<User>;
  toggleConnect: (targetUserId: string) => Promise<boolean>;
  toggleSavePost: (postId: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="%23111111"/><circle cx="12" cy="8" r="4" fill="%23ffd700" opacity="0.8"/><path d="M12 14c-4.5 0-6.5 2.5-7-4h14c-.5-1.5-2.5-4-7-4z" fill="%23ffd700" opacity="0.9"/></svg>`;

// Set default auth token in axios headers
const setAuthToken = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userState, setUserState] = useState<User | null>(null);
  
  const setUser = (val: User | null | ((prev: User | null) => User | null)) => {
    if (typeof val === 'function') {
      setUserState(prev => {
        const computed = val(prev);
        if (!computed) return null;
        const normalized = { ...computed };
        if (normalized._id && !normalized.id) {
          normalized.id = normalized._id;
        }
        if (normalized.id && !normalized._id) {
          normalized._id = normalized.id;
        }
        return normalized;
      });
    } else {
      if (!val) {
        setUserState(null);
      } else {
        const normalized = { ...val };
        if (normalized._id && !normalized.id) {
          normalized.id = normalized._id;
        }
        if (normalized.id && !normalized._id) {
          normalized._id = normalized.id;
        }
        setUserState(normalized);
      }
    }
  };
  
  const user = userState;
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  // Load initial token & user and set up axios interceptor
  useEffect(() => {
    // Set up global axios interceptor for 401 errors
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // Check if it's the deleted user message or token invalid
          if (
            error.response.data?.message === 'User account has been removed by admin' ||
            error.response.data?.message === 'Token is not valid' ||
            error.response.data?.message === 'No token, authorization denied'
          ) {
             setToken(null);
             setUser(null);
             setAuthToken(null);
             localStorage.removeItem('maatram_token');
             localStorage.removeItem('maatram_user');
             window.location.href = '/';
          }
        }
        return Promise.reject(error);
      }
    );

    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('maatram_token');
      
      if (storedToken) {
        setToken(storedToken);
        setAuthToken(storedToken);

        try {
          // Verify with server always for proper auth validation
          const res = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          const fetchedUser = res.data;
          

          if (fetchedUser._id && !fetchedUser.id) {
            fetchedUser.id = fetchedUser._id;
          }
          setUser(fetchedUser);
          localStorage.setItem('maatram_user', JSON.stringify(fetchedUser));
        } catch (err: any) {
          console.warn('Server auth verification failed or user blocked. Logging out.', err);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Login Dispatch
  const login = async (email: string, password: string, role: User['role'], secretAdminCode?: string) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password, role, secretAdminCode });
      const { token: userToken, user: userData } = res.data;
      
      setToken(userToken);
      setUser(userData);
      setAuthToken(userToken);
      localStorage.setItem('maatram_token', userToken);
      localStorage.setItem('maatram_user', JSON.stringify(userData));

      showNotification('Welcome back', `Logged in successfully as ${userData.name}!`, 'success');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Invalid credentials or connection error.';
      showNotification('Login Failed', errorMsg, 'error');
      setLoading(false);
      throw err;
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
      localStorage.setItem('maatram_token', userToken);
      localStorage.setItem('maatram_user', JSON.stringify(userData));

      showNotification('Account Created', `Welcome to the network, ${userData.name}!`, 'success');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Registration failed.';
      showNotification('Signup Failed', errorMsg, 'error');
      throw err;
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
  };

  // Update User Profile
  const updateProfile = async (profileData: Partial<UserProfile>): Promise<User> => {
    if (!user) throw new Error('Not authenticated');

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
  };

  // Connect / Disconnect with another user
  const toggleConnect = async (targetUserId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const res = await axios.post(`${API_URL}/users/connect/${targetUserId}`);
      // Refresh local user to sync connections
      await refreshUser();
      return res.data.connected;
    } catch (err) {
      console.error('Error connecting:', err);
      return false;
    }
  };

  // Toggle Save Post
  const toggleSavePost = async (postId: string): Promise<boolean> => {
    if (!user) return false;

    // Optimistic Update
    const isSavedAlready = user.savedPosts?.includes(postId);
    const newSavedPosts = isSavedAlready
      ? user.savedPosts?.filter(id => id !== postId)
      : [...(user.savedPosts || []), postId];
    
    setUser({ ...user, savedPosts: newSavedPosts });

    try {
      const res = await axios.post(`${API_URL}/posts/save/${postId}`);
      refreshUser(); // Background sync
      return res.data.saved;
    } catch (err) {
      console.error('Error saving post:', err);
      // Revert optimistic update by re-syncing from server
      refreshUser();
      return false;
    }
  };

  // Sync state
  const refreshUser = async () => {
    const storedToken = localStorage.getItem('maatram_token');
    if (!storedToken) return;

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
        login,
        register,
        logout,
        updateProfile,
        toggleConnect,
        toggleSavePost,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
