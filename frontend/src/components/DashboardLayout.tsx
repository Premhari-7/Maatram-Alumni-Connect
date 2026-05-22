import React, { useState, useEffect, useRef } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, API_URL, DEFAULT_AVATAR } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Sidebar } from './Sidebar';
import { AIChatbot } from './AIChatbot';
import { FiLoader, FiLock, FiLogOut, FiBell, FiTrash2, FiX, FiCheckSquare, FiUser, FiHeart, FiMessageCircle, FiShare2, FiUserPlus, FiUserCheck } from 'react-icons/fi';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfilePopup } from './UserProfilePopup';

// Notification type icon helper
const getNotifIcon = (type: string) => {
  switch (type) {
    case 'like': return <FiHeart size={14} style={{ color: '#ff6b6b' }} />;
    case 'comment': case 'reply': return <FiMessageCircle size={14} style={{ color: '#4ecdc4' }} />;
    case 'share': return <FiShare2 size={14} style={{ color: '#a78bfa' }} />;
    case 'connection_request': return <FiUserPlus size={14} style={{ color: '#ffd700' }} />;
    case 'connection_accepted': case 'connection': return <FiUserCheck size={14} style={{ color: '#22c55e' }} />;
    case 'connection_rejected': return <FiX size={14} style={{ color: '#ff6b6b' }} />;
    default: return <FiBell size={14} style={{ color: '#ffd700' }} />;
  }
};

export const DashboardLayout = () => {
  const { user, loading, logout, token, isMockMode, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Notification states from SocketContext
  const socketCtx = useSocket();
  const {
    notifications,
    unreadNotifCount,
    fetchNotifications,
    markNotifRead,
    markAllNotifsRead,
    deleteNotification,
    clearAllNotifications
  } = socketCtx;

  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreviewUserId, setSelectedPreviewUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#050505',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-yellow-primary)',
        fontSize: '24px',
        gap: '12px'
      }}>
        <FiLoader className="particle-glow" style={{ animation: 'spin 1.5s linear infinite' }} />
        <span style={{ fontFamily: 'var(--font-title)', fontWeight: 600 }}>Connecting Portal...</span>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Not authenticated? Go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Block Alumni or Scholars if they are not verified
  if ((user.role === 'alumni' || user.role === 'student') && !user.isVerified) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#050505',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'var(--font-body)'
      }}>
        <div 
          className="glass-panel"
          style={{
            maxWidth: '500px',
            width: '100%',
            padding: '40px 30px',
            textAlign: 'center',
            border: '1px solid var(--color-yellow-primary)',
            boxShadow: '0 10px 40px rgba(255, 215, 0, 0.15)'
          }}
        >
          <div style={{
            background: 'rgba(255, 215, 0, 0.1)',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-yellow-primary)',
            margin: '0 auto 20px auto'
          }}>
            <FiLock size={32} />
          </div>
          
          <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-title)', marginBottom: '12px' }}>
            Account Pending Verification
          </h2>
          
          <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', lineHeight: '1.7', marginBottom: '30px' }}>
            Thank you for registering as a {user.role === 'alumni' ? 'Alumni' : 'Scholar'}, {user.name}! To maintain the integrity of our scholar community, an administrator must verify your batch and registration details before you can access the platform.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              If you believe this is an error, contact office@maatramfoundation.org
            </span>
            
            <button 
              onClick={logout} 
              className="btn-primary" 
              style={{
                width: '100%',
                justifyContent: 'center',
                background: 'transparent',
                border: '1px solid var(--color-yellow-primary)',
                color: 'var(--color-yellow-primary)',
                boxShadow: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-yellow-primary)';
                e.currentTarget.style.color = '#000000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-yellow-primary)';
              }}
            >
              <FiLogOut /> Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle delete notification
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  // Handle accept connection request from notification
  const handleAcceptFromNotif = async (notif: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notif.relatedConnectionRequest) return;
    if (isMockMode) {
      // Mock: accept = add to connections
      const mockUsersStr = localStorage.getItem('mock_db_users');
      const currentUserStr = localStorage.getItem('maatram_user');
      if (mockUsersStr && currentUserStr) {
        const allUsers = JSON.parse(mockUsersStr);
        const curr = JSON.parse(currentUserStr);
        const senderId = notif.sender?._id || notif.sender?.id;

        const updatedUsers = allUsers.map((u: any) => {
          if ((u.id || u._id) === senderId) {
            if (!u.connections.includes(curr.id)) {
              u.connections.push(curr.id);
            }
          }
          if ((u.id || u._id) === curr.id) {
            if (!u.connections.includes(senderId)) {
              u.connections.push(senderId);
            }
          }
          return u;
        });

        if (!curr.connections.includes(senderId)) {
          curr.connections.push(senderId);
        }

        localStorage.setItem('mock_db_users', JSON.stringify(updatedUsers));
        localStorage.setItem('maatram_user', JSON.stringify(curr));
        refreshUser();
      }
      // Update the notification in localStorage
      const storedNotifsStr = localStorage.getItem('mock_db_notifications');
      if (storedNotifsStr) {
        const notifs = JSON.parse(storedNotifsStr);
        const updatedNotifs = notifs.map((n: any) => {
          if (n._id === notif._id) {
            return {
              ...n,
              type: 'connection_accepted',
              text: 'is now connected with you.',
              relatedConnectionRequest: undefined
            };
          }
          return n;
        });
        localStorage.setItem('mock_db_notifications', JSON.stringify(updatedNotifs));
        fetchNotifications();
      }
    } else {
      try {
        await axios.post(`${API_URL}/connections/accept/${notif.relatedConnectionRequest}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        refreshUser();
        await fetchNotifications();
      } catch (err) {
        console.error('Error accepting connection:', err);
      }
    }
  };

  // Handle reject connection request from notification
  const handleRejectFromNotif = async (notif: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notif.relatedConnectionRequest) return;
    if (isMockMode) {
      const storedNotifsStr = localStorage.getItem('mock_db_notifications');
      if (storedNotifsStr) {
        const notifs = JSON.parse(storedNotifsStr);
        const updatedNotifs = notifs.map((n: any) => {
          if (n._id === notif._id) {
            return {
              ...n,
              type: 'connection_rejected',
              text: 'connection request declined.',
              relatedConnectionRequest: undefined
            };
          }
          return n;
        });
        localStorage.setItem('mock_db_notifications', JSON.stringify(updatedNotifs));
        fetchNotifications();
      }
    } else {
      try {
        await axios.post(`${API_URL}/connections/reject/${notif.relatedConnectionRequest}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetchNotifications();
      } catch (err) {
        console.error('Error rejecting connection:', err);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
      display: 'flex',
      gap: '24px',
      padding: '20px 5% 20px 20px',
      position: 'relative'
    }}>
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Right Column: Main Content + Header + Cinematic Footer */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        minWidth: 0
      }}>
        
        {/* Top Header Bar */}
        <header style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '12px 24px',
          background: 'rgba(10, 10, 10, 0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '16px',
          position: 'relative',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-gray)', fontWeight: 500 }}>
              Welcome back, <span style={{ color: '#ffffff', fontWeight: 700 }}>{user.name}</span>
            </span>

            {/* Notification Bell Dropdown Container */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: unreadNotifCount > 0 ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.25)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              >
                <FiBell size={18} style={{ animation: unreadNotifCount > 0 ? 'bell-shake 2s ease infinite' : 'none' }} />
                
                {unreadNotifCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    background: '#ff4444',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontWeight: 700,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(255, 68, 68, 0.5)',
                    border: '1.5px solid #050505'
                  }}>
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Dropdown Panel */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '48px',
                      width: '360px',
                      maxHeight: '460px',
                      background: 'rgba(10, 10, 10, 0.96)',
                      backdropFilter: 'blur(14px)',
                      border: '1px solid rgba(255, 215, 0, 0.18)',
                      borderRadius: '12px',
                      boxShadow: '0 15px 40px rgba(0, 0, 0, 0.6)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      zIndex: 1000
                    }}
                  >
                    {/* Header */}
                    <div style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.01)'
                    }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#ffffff' }}>
                        Notifications ({notifications.length})
                      </span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {unreadNotifCount > 0 && (
                          <button
                            onClick={markAllNotifsRead}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-yellow-primary)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: 0
                            }}
                          >
                            <FiCheckSquare size={12} />
                            Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            onClick={() => { clearAllNotifications(); }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ff6b6b',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: 0
                            }}
                          >
                            <FiTrash2 size={11} />
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    {/* List */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                      {notifications.length === 0 ? (
                        <div style={{
                          padding: '30px 16px',
                          textAlign: 'center',
                          color: 'var(--color-text-gray)',
                          fontSize: '12.5px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <FiBell size={24} style={{ color: 'var(--color-text-muted)' }} />
                          <span>No notifications yet</span>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <motion.div
                            key={notif._id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            layout
                            onClick={() => {
                              markNotifRead(notif._id);
                              if (notif.sender?._id || notif.sender?.id) {
                                setSelectedPreviewUserId(notif.sender._id || notif.sender.id || null);
                              }
                              setIsOpen(false);
                            }}
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'flex-start',
                              cursor: 'pointer',
                              background: notif.isRead ? 'transparent' : 'rgba(255, 215, 0, 0.02)',
                              transition: 'background 0.2s ease',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(255, 215, 0, 0.02)'}
                          >
                            {/* Avatar with type icon overlay */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <img
                                src={notif.sender?.profile?.avatar || DEFAULT_AVATAR}
                                alt={notif.sender?.name || 'User'}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1px solid rgba(255, 215, 0, 0.15)'
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: '-2px',
                                right: '-2px',
                                background: '#0a0a0a',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {getNotifIcon(notif.type)}
                              </div>
                            </div>

                            {/* Text content */}
                            <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                              <p style={{
                                fontSize: '12px',
                                color: '#e0e0e0',
                                margin: 0,
                                lineHeight: '1.4',
                                wordBreak: 'break-word'
                              }}>
                                <span style={{ fontWeight: 700, color: '#ffffff' }}>
                                  {notif.sender?.name || 'A user'}
                                </span>{' '}
                                {notif.text || (
                                  notif.type === 'like' ? 'liked your post.' :
                                  notif.type === 'comment' ? 'commented on your post.' :
                                  notif.type === 'reply' ? 'replied to your comment.' :
                                  notif.type === 'share' ? 'shared your post.' :
                                  notif.type === 'connection_request' ? 'wants to connect with you.' :
                                  notif.type === 'connection_accepted' ? 'is now connected with you.' :
                                  notif.type === 'connection' ? 'is now connected with you.' : 'sent you a notification.'
                                )}
                              </p>
                              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                                {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>

                              {/* Accept/Reject buttons for connection requests */}
                              {notif.type === 'connection_request' && notif.relatedConnectionRequest && (
                                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => handleAcceptFromNotif(notif, e)}
                                    style={{
                                      padding: '4px 12px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      background: 'var(--color-yellow-primary)',
                                      color: '#000000',
                                      border: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#e6c200'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-yellow-primary)'}
                                  >
                                    <FiUserCheck size={12} /> Accept
                                  </button>
                                  <button
                                    onClick={(e) => handleRejectFromNotif(notif, e)}
                                    style={{
                                      padding: '4px 12px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      background: 'transparent',
                                      color: '#ff6b6b',
                                      border: '1px solid rgba(255, 107, 107, 0.3)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                  >
                                    <FiX size={12} /> Reject
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Status and Action tools */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              {!notif.isRead && (
                                <span style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: 'var(--color-yellow-primary)',
                                  boxShadow: '0 0 6px var(--color-yellow-primary)'
                                }} />
                              )}
                              
                              <button
                                onClick={(e) => handleDeleteNotification(notif._id, e)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-text-muted)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ff4444'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                              >
                                <FiTrash2 size={12} />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{
          flex: 1
        }}>
          <Outlet />
        </main>
      </div>

      {/* Floating AI Assistant Chatbot */}
      <AIChatbot />

      {/* Connection sender profile popup preview */}
      {selectedPreviewUserId && (
        <UserProfilePopup
          userId={selectedPreviewUserId}
          onClose={() => setSelectedPreviewUserId(null)}
        />
      )}

      {/* Shake Keyframe styles */}
      <style>{`
        @keyframes bell-shake {
          0% { transform: rotate(0); }
          15% { transform: rotate(5deg); }
          30% { transform: rotate(-5deg); }
          45% { transform: rotate(4deg); }
          60% { transform: rotate(-4deg); }
          75% { transform: rotate(2deg); }
          85% { transform: rotate(-2deg); }
          100% { transform: rotate(0); }
        }
      `}</style>
    </div>
  );
};
export default DashboardLayout;
