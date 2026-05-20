import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth, API_URL } from './AuthContext';

interface Message {
  id?: string;
  _id?: string;
  sender: string;
  recipient: string;
  text: string;
  read: boolean;
  createdAt: string;
}

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

  useEffect(() => {
    activePartnerIdRef.current = activePartnerId;
  }, [activePartnerId]);

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

    // Check status of other connections
    // Receive message
    newSocket.on('msg_receive', (msg: Message) => {
      const activeId = activePartnerIdRef.current;
      if (activeId && (msg.sender === activeId || msg.recipient === activeId)) {
        setChatMessages(prev => [...prev, msg]);
      }
      refreshConversations();
    });

    newSocket.on('msg_sent', (msg: Message) => {
      const activeId = activePartnerIdRef.current;
      if (activeId && (msg.sender === activeId || msg.recipient === activeId)) {
        setChatMessages(prev => [...prev, msg]);
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
    ];
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
      const activeId = activePartnerIdRef.current;
      if (activeId && (newMessage.sender === activeId || newMessage.recipient === activeId)) {
        setChatMessages(prev => [...prev, newMessage]);
      }
      refreshConversations();

      // Trigger automatic smart response from mock user!
      // This will simulate the typing indicator and send a logical response
      simulateMockPartnerResponse(recipientId, text);
    } else if (socket) {
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
        // Arjun (Software Engineer at Google)
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
        // Priya (Lead Product Designer at TechNova)
        if (lower.includes('design') || lower.includes('ux') || lower.includes('ui') || lower.includes('figma')) {
          replyText = `Product design is all about understanding the user and structuring simple flows. If you are learning Figma, let me know, and I can suggest some great resources and critique your portfolio.`;
        } else if (lower.includes('job') || lower.includes('intern') || lower.includes('technova')) {
          replyText = `We are expanding our UX team at TechNova. Keep building your portfolio, and I can refer you once an associate role opens up!`;
        } else {
          replyText = `Thanks for messaging. Design and development go hand-in-hand! Let me know how I can assist you with your career path or projects.`;
        }
      } else if (partnerId === 'student-1') {
        // Siddharth (Student)
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
      const activeId = activePartnerIdRef.current;
      if (activeId && (partnerMsg.sender === activeId || partnerMsg.recipient === activeId)) {
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
    }
  }, [user, isMockMode]);

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
        setActivePartnerId
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
