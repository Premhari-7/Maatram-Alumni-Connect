import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth, API_URL } from './AuthContext';
import axios from 'axios';

interface Message {
  id?: string;
  _id?: string;
  sender: any;
  recipient: string;
  text: string;
  read: boolean;
  createdAt: string;
}

interface NotificationItem {
  _id: string;
  sender: {
    _id?: string;
    id?: string;
    name: string;
    role: string;
    profile?: { avatar?: string };
  };
  recipient: string;
  type: string;
  text: string;
  isRead: boolean;
  createdAt: string;
  relatedPost?: any;
  relatedUser?: any;
  relatedConnectionRequest?: string;
}

const getUserIdString = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val._id) return String(val._id);
  if (val.id) return String(val.id);
  return String(val);
};

interface SocketContextProps {
  socket: Socket | null;
  onlineUsers: Set<string>;
  typingUsers: { [userId: string]: boolean };
  chatMessages: Message[];
  sendMessage: (recipientId: string, text: string) => void;
  sendTyping: (recipientId: string, isTyping: boolean) => void;
  sendReadReceipt: (senderId: string) => void;
  loadHistory: (partnerId: string) => Promise<void>;
  conversations: any[];
  refreshConversations: () => Promise<void>;
  loadingHistory: boolean;
  activePartnerId: string | null;
  setActivePartnerId: (id: string | null) => void;
  // Notification state
  notifications: NotificationItem[];
  unreadNotifCount: number;
  fetchNotifications: () => Promise<void>;
  markNotifRead: (id: string) => Promise<void>;
  markAllNotifsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

const SocketContext = createContext<SocketContextProps | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

const SOCKET_URL = API_URL.replace('/api', '');

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user, token, isMockMode } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: boolean }>({});
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const activePartnerIdRef = useRef<string | null>(null);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    activePartnerIdRef.current = activePartnerId;
  }, [activePartnerId]);

  // Default seeded notifications for mock mode
  const defaultMockNotifs: NotificationItem[] = [
    {
      _id: 'notif_mock_1',
      sender: {
        _id: 'user_mock_alumni_1',
        name: 'Premhari',
        role: 'alumni',
        profile: { avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }
      },
      recipient: '',
      type: 'like',
      text: 'liked your recent post.',
      isRead: false,
      createdAt: new Date(Date.now() - 1800000).toISOString()
    },
    {
      _id: 'notif_mock_2',
      sender: {
        _id: 'user_mock_scholar_1',
        name: 'Abitha',
        role: 'student',
        profile: { avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }
      },
      recipient: '',
      type: 'comment',
      text: 'commented on your post: "This looks fantastic! Let\'s connect."',
      isRead: false,
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      _id: 'notif_mock_3',
      sender: {
        _id: 'user_mock_alumni_2',
        name: 'Gokul',
        role: 'alumni',
        profile: { avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' }
      },
      recipient: '',
      type: 'connection_request',
      text: 'wants to connect with you',
      isRead: false,
      relatedConnectionRequest: 'mock_conn_req_1',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      _id: 'notif_mock_4',
      sender: {
        _id: 'alumni-1',
        name: 'Arjun Ramachandran',
        role: 'alumni',
        profile: { avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }
      },
      recipient: '',
      type: 'share',
      text: 'shared your post',
      isRead: true,
      createdAt: new Date(Date.now() - 172800000).toISOString()
    }
  ];

  // Fetch notifications from API or mock
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    if (isMockMode) {
      const stored = localStorage.getItem('mock_db_notifications');
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        localStorage.setItem('mock_db_notifications', JSON.stringify(defaultMockNotifs));
        setNotifications(defaultMockNotifs);
      }
    } else {
      try {
        const res = await axios.get(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    }
  }, [user, token, isMockMode]);

  // Mark single notification as read
  const markNotifRead = useCallback(async (id: string) => {
    if (isMockMode) {
      setNotifications(prev => {
        const updated = prev.map(n => n._id === id ? { ...n, isRead: true } : n);
        localStorage.setItem('mock_db_notifications', JSON.stringify(updated));
        return updated;
      });
    } else {
      try {
        await axios.put(`${API_URL}/notifications/${id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }
  }, [token, isMockMode]);

  // Mark all notifications as read
  const markAllNotifsRead = useCallback(async () => {
    if (isMockMode) {
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, isRead: true }));
        localStorage.setItem('mock_db_notifications', JSON.stringify(updated));
        return updated;
      });
    } else {
      try {
        await axios.put(`${API_URL}/notifications/read-all`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch (err) {
        console.error('Error marking all notifications as read:', err);
      }
    }
  }, [token, isMockMode]);

  // Delete single notification
  const deleteNotification = useCallback(async (id: string) => {
    if (isMockMode) {
      setNotifications(prev => {
        const updated = prev.filter(n => n._id !== id);
        localStorage.setItem('mock_db_notifications', JSON.stringify(updated));
        return updated;
      });
    } else {
      try {
        await axios.delete(`${API_URL}/notifications/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.filter(n => n._id !== id));
      } catch (err) {
        console.error('Error deleting notification:', err);
      }
    }
  }, [token, isMockMode]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    if (isMockMode) {
      setNotifications([]);
      localStorage.setItem('mock_db_notifications', JSON.stringify([]));
    } else {
      try {
        await axios.delete(`${API_URL}/notifications/clear-all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications([]);
      } catch (err) {
        console.error('Error clearing notifications:', err);
      }
    }
  }, [token, isMockMode]);

  // Initialize socket connection
  useEffect(() => {
    if (!token || !user || isMockMode) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Identify self on connect and automatic reconnect
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      newSocket.emit('identify', user.id);
    });

    // Online/Offline broadcasts
    newSocket.on('user_online', ({ userId }) => {
      setOnlineUsers(prev => new Set([...Array.from(prev), userId]));
    });

    newSocket.on('user_offline', ({ userId }) => {
      setOnlineUsers(prev => {
        const copy = new Set(prev);
        copy.delete(userId);
        return copy;
      });
    });

    // Receive message
    newSocket.on('msg_receive', (msg: Message) => {
      const activeId = getUserIdString(activePartnerIdRef.current);
      const senderId = getUserIdString(msg.sender);
      const recipientId = getUserIdString(msg.recipient);
      if (activeId && (senderId === activeId || recipientId === activeId)) {
        setChatMessages(prev => [...prev, msg]);
      }
      refreshConversations();
    });

    newSocket.on('msg_sent', (msg: Message) => {
      const activeId = getUserIdString(activePartnerIdRef.current);
      const senderId = getUserIdString(msg.sender);
      const recipientId = getUserIdString(msg.recipient);
      if (activeId && (senderId === activeId || recipientId === activeId)) {
        setChatMessages(prev => {
          const tempIndex = prev.findIndex(m => 
            ((m.id && m.id.startsWith('temp_')) || (m._id && m._id.startsWith('temp_'))) &&
            getUserIdString(m.sender) === senderId &&
            getUserIdString(m.recipient) === recipientId &&
            m.text === msg.text
          );
          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = msg;
            return updated;
          }
          // Also double check if message already exists with actual ID to prevent double insertion
          const exists = prev.some(m => (m._id === msg._id || m.id === msg.id) && m._id && msg._id);
          if (exists) return prev;
          return [...prev, msg];
        });
      }
      refreshConversations();
    });

    newSocket.on('user_typing', ({ senderId, isTyping }) => {
      setTypingUsers(prev => ({ ...prev, [senderId]: isTyping }));
    });

    newSocket.on('messages_read', ({ readBy }) => {
      setChatMessages(prev =>
        prev.map(m => (m.recipient === readBy ? { ...m, read: true } : m))
      );
      refreshConversations();
    });

    // Real-time notification reception
    newSocket.on('new_notification', (notif: NotificationItem) => {
      setNotifications(prev => [notif, ...prev]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token, user, isMockMode]);

  // Load chat conversations list
  const refreshConversations = async () => {
    if (!user) return;

    if (isMockMode) {
      // Offline conversations list mock
      const mockHistory = getMockMessages();
      
      // Get all unique users in chat history involving current user
      const partnerIds = new Set<string>();
      mockHistory.forEach(m => {
        if (m.sender === user.id) partnerIds.add(m.recipient);
        if (m.recipient === user.id) partnerIds.add(m.sender);
      });

      // Get user profiles
      const dbUsersStr = localStorage.getItem('mock_db_users');
      if (!dbUsersStr) return;
      const allUsers: any[] = JSON.parse(dbUsersStr);
      
      const convs = allUsers
        .filter(u => partnerIds.has(u.id))
        .map(u => {
          const thread = mockHistory.filter(
            m => (m.sender === user.id && m.recipient === u.id) || (m.sender === u.id && m.recipient === user.id)
          );
          const lastMessage = thread[thread.length - 1];
          const unreadCount = thread.filter(m => m.sender === u.id && m.recipient === user.id && !m.read).length;

          return {
            partner: {
              _id: u.id,
              name: u.name,
              role: u.role,
              profile: u.profile
            },
            lastMessage,
            unreadCount
          };
        });

      // Sort by last message date
      convs.sort((a, b) => {
        const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setConversations(convs);
    } else {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const res = await fetch(`${API_URL}/messages/conversations`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
          setConversations(data);
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
      }
    }
  };

  // Get local mock messages
  const getMockMessages = (): Message[] => {
    const stored = localStorage.getItem('mock_chat_messages');
    if (stored) return JSON.parse(stored);

    // Seed default messages
    const defaultMsgs: Message[] = [
      {
        sender: 'alumni-1',
        recipient: 'student-1',
        text: 'Hi Siddharth! How are you doing?',
        read: true,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        sender: 'student-1',
        recipient: 'alumni-1',
        text: 'Hey Arjun! I am doing good. How about you?',
        read: true,
        createdAt: new Date(Date.now() - 3600000 * 1.9).toISOString()
      },
      {
        sender: 'alumni-1',
        recipient: 'student-1',
        text: 'I am good too! Are you joining the alumni meet this weekend?',
        read: true,
        createdAt: new Date(Date.now() - 3600000 * 1.8).toISOString()
      },
      {
        sender: 'student-1',
        recipient: 'alumni-1',
        text: 'Yes, definitely. Looking forward to it!',
        read: true,
        createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString()
      },
      {
        sender: 'alumni-1',
        recipient: 'student-1',
        text: 'Great! See you there.',
        read: false,
        createdAt: new Date(Date.now() - 3600000 * 0.5).toISOString()
      }
    ].map((m, index) => ({ ...m, id: `mock_msg_seed_${index}` }));
    localStorage.setItem('mock_chat_messages', JSON.stringify(defaultMsgs));
    return defaultMsgs;
  };

  // Load chat history between self and partner
  const loadHistory = async (partnerId: string) => {
    if (!user) return;
    setLoadingHistory(true);

    if (isMockMode) {
      const mockHistory = getMockMessages();
      const thread = mockHistory.filter(
        m => (m.sender === user.id && m.recipient === partnerId) || (m.sender === partnerId && m.recipient === user.id)
      );

      // Mark partner's messages as read
      const updatedHistory = mockHistory.map(m => {
        if (m.sender === partnerId && m.recipient === user.id) {
          return { ...m, read: true };
        }
        return m;
      });
      localStorage.setItem('mock_chat_messages', JSON.stringify(updatedHistory));

      setChatMessages(thread);
      setLoadingHistory(false);
      refreshConversations();
    } else {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const res = await fetch(`${API_URL}/messages/history/${partnerId}`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
          setChatMessages(data);
        }
      } catch (err) {
        console.error('Error fetching chat history:', err);
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  // Send Message
  const sendMessage = (recipientId: string, text: string) => {
    if (!user) return;

    if (isMockMode) {
      const newMessage: Message = {
        id: 'mock_msg_' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        sender: user.id,
        recipient: recipientId,
        text,
        read: false,
        createdAt: new Date().toISOString()
      };

      // Save to local storage mock DB
      const history = getMockMessages();
      history.push(newMessage);
      localStorage.setItem('mock_chat_messages', JSON.stringify(history));

      // Update state if matches active partner
      const activeId = getUserIdString(activePartnerIdRef.current);
      const senderId = getUserIdString(newMessage.sender);
      const targetRecipientId = getUserIdString(newMessage.recipient);
      if (activeId && (senderId === activeId || targetRecipientId === activeId)) {
        setChatMessages(prev => [...prev, newMessage]);
      }
      refreshConversations();

      // Trigger automatic smart response from mock user!
      simulateMockPartnerResponse(recipientId, text);
    } else if (socket) {
      // Optimistically append the sent message locally
      const tempMessage: Message = {
        id: 'temp_msg_' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        _id: 'temp_msg_' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        sender: user.id || (user as any)._id,
        recipient: recipientId,
        text,
        read: false,
        createdAt: new Date().toISOString()
      };

      const activeId = getUserIdString(activePartnerIdRef.current);
      const senderId = getUserIdString(tempMessage.sender);
      const targetRecipientId = getUserIdString(tempMessage.recipient);
      if (activeId && (senderId === activeId || targetRecipientId === activeId)) {
        setChatMessages(prev => [...prev, tempMessage]);
      }

      socket.emit('private_message', { recipientId, text });
    }
  };

  // Typing indicator trigger
  const sendTyping = (recipientId: string, isTyping: boolean) => {
    if (isMockMode) {
      // Mock typing logic (no broadcast needed, typing handled in simulator)
    } else if (socket) {
      socket.emit('typing', { recipientId, isTyping });
    }
  };

  // Read receipt trigger
  const sendReadReceipt = (senderId: string) => {
    if (isMockMode) {
      const history = getMockMessages();
      const updated = history.map(m => {
        if (m.sender === senderId && m.recipient === user?.id) {
          return { ...m, read: true };
        }
        return m;
      });
      localStorage.setItem('mock_chat_messages', JSON.stringify(updated));
      refreshConversations();
    } else if (socket) {
      socket.emit('read_receipt', { senderId });
    }
  };

  // Simulating mock user replies
  const simulateMockPartnerResponse = (partnerId: string, userText: string) => {
    const dbUsersStr = localStorage.getItem('mock_db_users');
    if (!dbUsersStr) return;
    const allUsers: any[] = JSON.parse(dbUsersStr);
    const partner = allUsers.find(u => u.id === partnerId);
    if (!partner) return;

    // Simulate typing: turn on typing indicator
    setTimeout(() => {
      setTypingUsers(prev => ({ ...prev, [partnerId]: true }));
    }, 1000);

    // Send reply
    setTimeout(() => {
      // Turn off typing indicator
      setTypingUsers(prev => ({ ...prev, [partnerId]: false }));

      // Pick response based on message content
      const lower = userText.toLowerCase();
      let replyText = `Thanks for reaching out! Looking forward to talking more.`;

      if (partnerId === 'alumni-1') {
        if (lower.includes('google') || lower.includes('job') || lower.includes('career') || lower.includes('work') || lower.includes('interview')) {
          replyText = `Working at Google is a great experience. I would recommend focusing heavily on DSA, system design, and coding practices. I can review your resume if you want!`;
        } else if (lower.includes('meet') || lower.includes('event') || lower.includes('weekend')) {
          replyText = `Yes, I will definitely be at the Maatram Alumni Meet. It is a fantastic opportunity to see everyone and connect with current students. See you there!`;
        } else if (lower.includes('mentor') || lower.includes('help') || lower.includes('guide')) {
          replyText = `I would love to mentor you. Let me know what specific questions you have about frontend development, React, or job applications.`;
        } else {
          replyText = `That sounds interesting. As a Maatram alumnus, I am always glad to connect and share experiences. What are you currently working on?`;
        }
      } else if (partnerId === 'alumni-2') {
        if (lower.includes('design') || lower.includes('ux') || lower.includes('ui') || lower.includes('figma')) {
          replyText = `Product design is all about understanding the user and structuring simple flows. If you are learning Figma, let me know, and I can suggest some great resources and critique your portfolio.`;
        } else if (lower.includes('job') || lower.includes('intern') || lower.includes('technova')) {
          replyText = `We are expanding our UX team at TechNova. Keep building your portfolio, and I can refer you once an associate role opens up!`;
        } else {
          replyText = `Thanks for messaging. Design and development go hand-in-hand! Let me know how I can assist you with your career path or projects.`;
        }
      } else if (partnerId === 'student-1') {
        if (lower.includes('study') || lower.includes('college') || lower.includes('course')) {
          replyText = `College classes are going well. I am focusing a lot on JavaScript and web dev in my self-study time.`;
        } else if (lower.includes('help') || lower.includes('mentor')) {
          replyText = `I would really appreciate some advice on how to build a portfolio website and what skills I should focus on for next semester.`;
        } else {
          replyText = `Awesome! I am really glad I connected with you. Maatram Foundation has given us such a great support system.`;
        }
      }

      // Filter out emojis in case
      replyText = replyText.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");

      const partnerMsg: Message = {
        id: 'mock_msg_' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        sender: partnerId,
        recipient: user?.id || '',
        text: replyText,
        read: false,
        createdAt: new Date().toISOString()
      };

      const history = getMockMessages();
      history.push(partnerMsg);
      localStorage.setItem('mock_chat_messages', JSON.stringify(history));

      // Append to active chat if matches active partner
      const activeId = getUserIdString(activePartnerIdRef.current);
      const senderId = getUserIdString(partnerMsg.sender);
      const recipientId = getUserIdString(partnerMsg.recipient);
      if (activeId && (senderId === activeId || recipientId === activeId)) {
        setChatMessages(prev => [...prev, partnerMsg]);
      }
      refreshConversations();
    }, 3000);
  };

  // Sync state on user changes
  useEffect(() => {
    if (user) {
      // Trigger conversation load and set online statuses
      refreshConversations();
      fetchNotifications();
      if (isMockMode) {
        // Set all other mock users as online
        const mockOnline = new Set<string>();
        const dbUsersStr = localStorage.getItem('mock_db_users');
        if (dbUsersStr) {
          const allUsers: any[] = JSON.parse(dbUsersStr);
          allUsers.forEach(u => {
            if (u.id !== user.id) mockOnline.add(u.id);
          });
        }
        setOnlineUsers(mockOnline);
      }
    } else {
      setConversations([]);
      setChatMessages([]);
      setOnlineUsers(new Set());
      setNotifications([]);
    }
  }, [user, isMockMode]);

  // Periodically refresh notifications
  useEffect(() => {
    if (user) {
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  // Listen for mock notification updates
  useEffect(() => {
    const handleMockNotifUpdate = () => {
      fetchNotifications();
    };
    window.addEventListener('mock_notifications_updated', handleMockNotifUpdate);
    return () => window.removeEventListener('mock_notifications_updated', handleMockNotifUpdate);
  }, [fetchNotifications]);

  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        typingUsers,
        chatMessages,
        sendMessage,
        sendTyping,
        sendReadReceipt,
        loadHistory,
        conversations,
        refreshConversations,
        loadingHistory,
        activePartnerId,
        setActivePartnerId,
        notifications,
        unreadNotifCount,
        fetchNotifications,
        markNotifRead,
        markAllNotifsRead,
        deleteNotification,
        clearAllNotifications
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
