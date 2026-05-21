import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { FiSend, FiUser, FiMoreVertical, FiCheck, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';
import { motion } from 'framer-motion';

export const Chat = () => {
  const { user, token, isMockMode } = useAuth();
  const { 
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
  } = useSocket();
  const [searchParams] = useSearchParams();

  const [activePartnerUser, setActivePartnerUser] = useState<any | null>(null);
  const [text, setText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, typingUsers, activePartnerId]);

  // Handle active partner selection from URL search queries (e.g. ?active=123)
  useEffect(() => {
    const activeId = searchParams.get('active');
    if (activeId) {
      setActivePartnerId(activeId);
      loadHistory(activeId);
      sendReadReceipt(activeId);
    } else {
      refreshConversations();
    }
  }, [searchParams]);

  // Load and cache active partner profile
  useEffect(() => {
    if (!activePartnerId) {
      setActivePartnerUser(null);
      return;
    }

    const found = conversations.find(c => c.partner?._id === activePartnerId || c.partner?.id === activePartnerId);
    if (found) {
      setActivePartnerUser(found.partner);
    } else {
      const fetchPartnerProfile = async () => {
        if (isMockMode) {
          const mockUsersStr = localStorage.getItem('mock_db_users');
          if (mockUsersStr) {
            const allUsers = JSON.parse(mockUsersStr);
            const foundUser = allUsers.find((u: any) => u.id === activePartnerId || u._id === activePartnerId);
            if (foundUser) {
              setActivePartnerUser({
                _id: foundUser.id || foundUser._id,
                name: foundUser.name,
                role: foundUser.role,
                profile: foundUser.profile
              });
            }
          }
        } else {
          try {
            const res = await axios.get(`${API_URL}/users/${activePartnerId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setActivePartnerUser(res.data);
          } catch (err) {
            console.error('Error fetching partner user details:', err);
          }
        }
      };
      fetchPartnerProfile();
    }
  }, [activePartnerId, conversations, isMockMode, token]);

  // Emit typing status
  useEffect(() => {
    if (!activePartnerId) return;

    if (text.length > 0) {
      sendTyping(activePartnerId, true);
    } else {
      sendTyping(activePartnerId, false);
    }

    return () => {
      sendTyping(activePartnerId, false);
    };
  }, [text, activePartnerId]);

  const selectThread = (partnerId: string) => {
    setActivePartnerId(partnerId);
    loadHistory(partnerId);
    sendReadReceipt(partnerId);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activePartnerId) return;

    sendMessage(activePartnerId, text.trim());
    setText('');
  };

  const activeUserOnline = activePartnerId ? onlineUsers.has(activePartnerId) : false;
  const isPartnerTyping = activePartnerId ? !!typingUsers[activePartnerId] : false;

  return (
    <div 
      className="glass-panel chat-grid-container"
      style={{
        height: 'calc(100vh - 120px)',
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        overflow: 'hidden',
        padding: 0,
        borderColor: 'rgba(255, 215, 0, 0.08)'
      }}
    >
      {/* Left Column: thread list sidebar */}
      <div style={{
        borderRight: '1px solid var(--color-border-glass)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(5,5,5,0.4)'
      }}>
        {/* Title */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--color-border-glass)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-title)' }}>
            Messages
          </h2>
        </div>

        {/* List of active threads */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-gray)', fontSize: '13px' }}>
              No messages yet. Go to Connections to find scholars or alumni and initiate a chat!
            </div>
          ) : (
            conversations.map(c => {
              const partner = c.partner;
              if (!partner) return null;
              
              const pId = partner._id || partner.id;
              const isSelected = pId === activePartnerId;
              const isOnline = onlineUsers.has(pId);

              return (
                <div
                  key={pId}
                  onClick={() => selectThread(pId)}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(255, 215, 0, 0.06)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--color-yellow-primary)' : '3px solid transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 215, 0, 0.02)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Avatar wrapper with online status dot indicator */}
                  <div style={{ position: 'relative' }}>
                    <img
                      src={partner.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={partner.name}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: isSelected ? '1.5px solid var(--color-yellow-primary)' : '1px solid var(--color-border-glass)'
                      }}
                    />
                    
                    {isOnline && (
                      <span style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        background: '#00cc66',
                        border: '2px solid #050505',
                        boxShadow: '0 0 4px #00cc66'
                      }} />
                    )}
                  </div>

                  {/* Profile info & message preview */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: isSelected ? 'var(--color-yellow-primary)' : '#ffffff',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      }}>
                        {partner.name}
                      </h4>
                      {c.lastMessage && (
                        <span style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>
                          {new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                      <p style={{
                        fontSize: '12px',
                        color: isSelected ? '#ffffff' : 'var(--color-text-gray)',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        margin: 0,
                        flex: 1
                      }}>
                        {c.lastMessage ? c.lastMessage.text : 'Start chatting...'}
                      </p>
                      {c.unreadCount > 0 && (
                        <span style={{
                          background: 'var(--color-yellow-primary)',
                          color: '#000000',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          minWidth: '18px',
                          textAlign: 'center'
                        }}>
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Active thread viewport */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {activePartnerId && activePartnerUser ? (
          <>
            {/* Header info */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--color-border-glass)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(5,5,5,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={activePartnerUser.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={activePartnerUser.name}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-yellow-primary)' }}
                />
                
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                    {activePartnerUser.name}
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-gray)' }}>
                    {activeUserOnline ? (
                      <span style={{ color: '#00cc66', fontWeight: 500 }}>Online</span>
                    ) : (
                      <span>Offline</span>
                    )}
                  </span>
                </div>
              </div>
              
              <button style={{ background: 'none', border: 'none', color: 'var(--color-text-gray)', cursor: 'pointer' }}>
                <FiMoreVertical size={20} />
              </button>
            </div>

            {/* Messages body thread feed */}
            <div style={{
              flex: 1,
              padding: '24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: 'rgba(0,0,0,0.2)'
            }}>
              {loadingHistory ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', color: 'var(--color-text-gray)' }}>
                  Loading chat history...
                </div>
              ) : chatMessages.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  No messages in this chat thread. Say hello to start the conversation!
                </div>
              ) : (
                chatMessages.map(msg => {
                  const mId = msg._id || msg.id;
                  const isSent = (msg.sender?._id || msg.sender?.id || msg.sender) === (user?.id || (user as any)?._id);

                  return (
                    <div
                      key={mId}
                      style={{
                        alignSelf: isSent ? 'flex-end' : 'flex-start',
                        maxWidth: '65%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isSent ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div style={{
                        padding: '10px 16px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        lineHeight: '1.4',
                        background: isSent ? 'var(--color-yellow-primary)' : 'rgba(30, 30, 30, 0.8)',
                        color: isSent ? '#000000' : '#ffffff',
                        border: isSent ? 'none' : '1px solid var(--color-border-glass)',
                        borderTopRightRadius: isSent ? '2px' : '12px',
                        borderTopLeftRadius: !isSent ? '2px' : '12px',
                        boxShadow: isSent ? '0 4px 12px rgba(255, 215, 0, 0.12)' : 'none'
                      }}>
                        {msg.text}
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '9px',
                        color: 'var(--color-text-muted)',
                        marginTop: '4px',
                        padding: '0 4px'
                      }}>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isSent && (
                          <span>
                            {msg.read ? <FiCheckCircle size={10} style={{ color: 'var(--color-yellow-primary)' }} /> : <FiCheck size={10} />}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing loader */}
              {isPartnerTyping && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', padding: '10px 14px', background: 'rgba(30,30,30,0.8)', borderRadius: '12px', border: '1px solid var(--color-border-glass)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-gray)', marginRight: '6px' }}>typing</span>
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-yellow-primary)', marginTop: '6px' }} />
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-yellow-primary)', marginTop: '6px' }} />
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-yellow-primary)', marginTop: '6px' }} />
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input send tray */}
            <form
              onSubmit={handleSend}
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--color-border-glass)',
                background: 'rgba(5,5,5,0.4)',
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}
            >
              <input
                type="text"
                placeholder="Type a message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(10, 10, 10, 0.7)',
                  border: '1px solid var(--color-border-glass)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
              
              <button
                type="submit"
                style={{
                  background: 'var(--color-yellow-primary)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(255, 215, 0, 0.2)'
                }}
              >
                <FiSend size={18} />
              </button>
            </form>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-gray)',
            gap: '12px'
          }}>
            <FiUser size={48} className="particle-glow" style={{ color: 'var(--color-border-glass-hover)' }} />
            <span style={{ fontSize: '14px' }}>Select a conversation to start messaging</span>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .chat-grid-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
};
export default Chat;
