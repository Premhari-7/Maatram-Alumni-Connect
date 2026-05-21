import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL, User } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';
import { FiX, FiMail, FiBriefcase, FiUsers, FiAward, FiMessageSquare, FiUserCheck, FiUserPlus, FiLock, FiClock, FiUserMinus, FiLoader, FiUser, FiBookOpen } from 'react-icons/fi';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface UserProfilePopupProps {
  userId: string | null;
  onClose: () => void;
}

type ConnectionStatus = 'connected' | 'pending_sent' | 'pending_received' | 'none';

export const UserProfilePopup = ({ userId, onClose }: UserProfilePopupProps) => {
  const { user, token, isMockMode, toggleConnect, refreshUser } = useAuth();
  const { showNotification } = useNotification();
  const { fetchNotifications } = useSocket();
  const navigate = useNavigate();

  const [previewUser, setPreviewUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('none');
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showPrivatePopup, setShowPrivatePopup] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      setLoading(true);

      if (isMockMode) {
        // Fetch from local mock database
        const mockUsersStr = localStorage.getItem('mock_db_users');
        if (mockUsersStr) {
          const list = JSON.parse(mockUsersStr) as User[];
          const found = list.find(u => u.id === userId || (u as any)._id === userId);
          if (found) {
            const isOwner = (found.id || (found as any)._id) === user?.id;
            const isAdmin = user?.role === 'admin';
            const connections = found.connections || [];
            const isConnected = connections.includes(user?.id || '');
            
            let userToSet = { ...found };
            if (found.isPrivate && !isOwner && !isAdmin && !isConnected) {
              userToSet.email = '••••••••@••••.•••';
              userToSet.profile = {
                avatar: found.profile?.avatar || '',
                cover: found.profile?.cover || '',
                bio: 'This account is private.',
                skills: [],
                department: 'Private',
                batch: 'Private',
                company: 'Private',
                jobTitle: 'Private',
                socialLinks: { linkedin: '', github: '', twitter: '', website: '' }
              };
              (userToSet as any).isPrivateMasked = true;
            }
            setPreviewUser(userToSet);
            setConnectionStatus(isConnected ? 'connected' : 'none');
          }
        }
        setLoading(false);
      } else {
        try {
          const res = await axios.get(`${API_URL}/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setPreviewUser(res.data);

          // Fetch connection status
          try {
            const statusRes = await axios.get(`${API_URL}/connections/status/${userId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setConnectionStatus(statusRes.data.status);
          } catch {
            setConnectionStatus(user?.connections?.includes(userId) ? 'connected' : 'none');
          }
        } catch (err) {
          console.error('Error fetching preview user profile:', err);
          showNotification('Error', 'Failed to load user profile details.', 'error');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [userId, isMockMode, token]);

  if (!userId) return null;

  const isOwnProfile = user?.id === userId || (user as any)?._id === userId;

  const handleConnectAction = async () => {
    if (!previewUser) return;
    const targetId = previewUser.id || (previewUser as any)._id;

    if (connectionStatus === 'connected') {
      setShowDisconnectConfirm(true);
      return;
    }

    if (connectionStatus === 'pending_sent') {
      showNotification('Request Pending', 'Your connection request is already pending approval.', 'info');
      return;
    }

    // Check if private account
    if (previewUser.isPrivate || (previewUser as any).isPrivateMasked) {
      setShowPrivatePopup(true);
      return;
    }

    // Public account: direct connect
    setConnecting(true);
    if (isMockMode) {
      await toggleConnect(targetId);
      setConnectionStatus(prev => prev === 'connected' ? 'none' : 'connected');
    } else {
      try {
        const res = await axios.post(`${API_URL}/connections/request`, { targetUserId: targetId }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.status === 'connected') {
          setConnectionStatus('connected');
          refreshUser();
          showNotification('Connected', `You are now connected with ${previewUser.name}!`, 'success');
        }
      } catch (err: any) {
        showNotification('Error', err.response?.data?.message || 'Failed to connect.', 'error');
      }
    }
    setConnecting(false);
  };

  const handleSendPrivateRequest = async () => {
    if (!previewUser) return;
    setConnecting(true);
    const targetId = previewUser.id || (previewUser as any)._id;

    if (isMockMode) {
      await toggleConnect(targetId);
      setConnectionStatus('connected');
      showNotification('Connected', `Connected with ${previewUser.name}! (Mock mode)`, 'success');
    } else {
      try {
        const res = await axios.post(`${API_URL}/connections/request`, { targetUserId: targetId }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.status === 'pending') {
          setConnectionStatus('pending_sent');
          showNotification('Request Sent', 'Connection request sent. Waiting for approval.', 'info');
        } else {
          setConnectionStatus('connected');
          refreshUser();
          showNotification('Connected', `You are now connected with ${previewUser.name}!`, 'success');
        }
      } catch (err: any) {
        showNotification('Error', err.response?.data?.message || 'Failed to send request.', 'error');
      }
    }
    setConnecting(false);
    setShowPrivatePopup(false);
  };

  const handleDisconnect = async () => {
    if (!previewUser) return;
    setConnecting(true);
    const targetId = previewUser.id || (previewUser as any)._id;

    if (isMockMode) {
      await toggleConnect(targetId);
      setConnectionStatus('none');
    } else {
      try {
        await axios.post(`${API_URL}/connections/disconnect/${targetId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConnectionStatus('none');
        refreshUser();
        showNotification('Disconnected', `Disconnected from ${previewUser.name}.`, 'info');
      } catch (err: any) {
        showNotification('Error', err.response?.data?.message || 'Failed to disconnect.', 'error');
      }
    }
    setConnecting(false);
    setShowDisconnectConfirm(false);
  };

  const handleAcceptRequest = async () => {
    if (!previewUser) return;
    setConnecting(true);
    try {
      const statusRes = await axios.get(`${API_URL}/connections/status/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statusRes.data.requestId) {
        await axios.post(`${API_URL}/connections/accept/${statusRes.data.requestId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConnectionStatus('connected');
        refreshUser();
        fetchNotifications();
        showNotification('Connected', `You are now connected with ${previewUser.name}!`, 'success');
      }
    } catch (err) {
      console.error('Error accepting request:', err);
    }
    setConnecting(false);
  };

  const handleStartChat = () => {
    if (!previewUser) return;
    const targetId = previewUser.id || (previewUser as any)._id;
    if ((previewUser.isPrivate || (previewUser as any).isPrivateMasked) && connectionStatus !== 'connected') {
      showNotification('Private Account', 'Connect with this user first to send messages.', 'warning');
      return;
    }
    onClose();
    navigate(`/dashboard/chat?active=${targetId}`);
  };

  const handleViewFullProfile = () => {
    if (!previewUser) return;
    onClose();
    navigate(`/dashboard/profile/${previewUser.id || (previewUser as any)._id}`);
  };

  // Get button appearance based on status
  const getConnectButton = () => {
    switch (connectionStatus) {
      case 'connected':
        return { icon: <FiUserCheck size={14} />, text: 'Connected', className: 'btn-outline' };
      case 'pending_sent':
        return { icon: <FiClock size={14} />, text: 'Request Pending', className: 'btn-outline' };
      case 'pending_received':
        return { icon: <FiUserPlus size={14} />, text: 'Accept Request', className: 'btn-primary' };
      default:
        return { icon: <FiUserPlus size={14} />, text: 'Connect', className: 'btn-primary' };
    }
  };

  const btnConfig = getConnectButton();

  return (
    <>
      <div 
        className="notification-overlay" 
        style={{ zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="glass-panel"
          style={{
            width: '90%',
            maxWidth: '520px',
            padding: 0,
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid var(--color-yellow-primary)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
            background: 'rgba(10, 10, 10, 0.96)',
            backdropFilter: 'blur(20px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Cover Photo */}
          <div 
            style={{
              height: '130px',
              backgroundImage: `url(${previewUser?.profile?.cover || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000'})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ff4444';
                e.currentTarget.style.borderColor = '#ff4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <FiX size={16} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
              <FiLoader size={20} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '14px', marginTop: '8px' }}>Loading profile details...</p>
            </div>
          ) : !previewUser ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
              <span style={{ fontSize: '14px' }}>User not found.</span>
            </div>
          ) : (
            <div style={{ padding: '0 24px 24px 24px', position: 'relative' }}>
              {/* Avatar positioning */}
              <div style={{ marginTop: '-45px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={previewUser.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={previewUser.name}
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--color-yellow-primary)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                      background: '#0a0a0a'
                    }}
                  />
                  {previewUser.isPrivate && (
                    <div style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      background: '#0a0a0a',
                      border: '1.5px solid var(--color-yellow-primary)',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FiLock size={10} style={{ color: 'var(--color-yellow-primary)' }} />
                    </div>
                  )}
                </div>

                {/* Action buttons next to avatar */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!isOwnProfile && (
                    <>
                      {connectionStatus === 'pending_received' ? (
                        <button
                          onClick={handleAcceptRequest}
                          disabled={connecting}
                          className="btn-primary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            height: '32px'
                          }}
                        >
                          <FiUserCheck size={14} /> Accept
                        </button>
                      ) : (
                        <button
                          onClick={handleConnectAction}
                          disabled={connecting || connectionStatus === 'pending_sent'}
                          className={btnConfig.className}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: connectionStatus === 'pending_sent' ? 'default' : 'pointer',
                            borderRadius: '6px',
                            height: '32px',
                            borderColor: connectionStatus === 'connected' ? 'rgba(255, 215, 0, 0.4)' : undefined,
                            color: connectionStatus === 'connected' ? 'var(--color-yellow-primary)' : undefined,
                            opacity: connectionStatus === 'pending_sent' ? 0.6 : 1
                          }}
                        >
                          {connecting ? <FiLoader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : btnConfig.icon} {btnConfig.text}
                        </button>
                      )}

                      <button
                        onClick={handleStartChat}
                        className="btn-outline"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          height: '32px',
                          borderColor: 'rgba(255,255,255,0.15)',
                          color: '#ffffff',
                          opacity: ((previewUser.isPrivate || (previewUser as any).isPrivateMasked) && connectionStatus !== 'connected') ? 0.4 : 1
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-yellow-primary)';
                          e.currentTarget.style.color = 'var(--color-yellow-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                      >
                        <FiMessageSquare size={14} /> Message
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* User details */}
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)', margin: '0 0 4px 0' }}>
                  {previewUser.name}
                </h3>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    background: 'var(--color-yellow-primary)',
                    color: '#000000',
                    padding: '1.5px 6px',
                    borderRadius: '3px',
                    textTransform: 'uppercase'
                  }}>
                    {previewUser.role === 'student' ? 'scholar' : previewUser.role}
                  </span>
                  
                  {previewUser.profile?.department && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-gray)' }}>
                      • {previewUser.profile.department}
                    </span>
                  )}
                  
                  {previewUser.profile?.batch && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-gray)' }}>
                      • Batch {previewUser.profile.batch}
                    </span>
                  )}
                </div>

                {(previewUser as any).isPrivateMasked ? (
                  <div style={{
                    background: 'rgba(255, 215, 0, 0.02)',
                    border: '1px solid rgba(255, 215, 0, 0.15)',
                    borderRadius: '8px',
                    padding: '20px 16px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    margin: '16px 0'
                  }}>
                    <div style={{ color: 'var(--color-yellow-primary)' }}>
                      <FiLock size={28} />
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}>This profile is private</h4>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-gray)', margin: 0, lineHeight: '1.5' }}>
                      Send a connection request to see their full profile, bio, skills, and updates.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Job Title and Company */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e0e0e0', marginBottom: '12px' }}>
                      <FiBriefcase style={{ color: 'var(--color-yellow-primary)', flexShrink: 0 }} />
                      <span>
                        {previewUser.profile?.jobTitle ? `${previewUser.profile.jobTitle} at ` : ''}
                        {previewUser.profile?.company || (previewUser.role === 'student' ? 'Student Scholar' : 'Alumni Graduate')}
                      </span>
                    </div>

                    {/* Email address */}
                    {isOwnProfile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e0e0e0', marginBottom: '12px' }}>
                        <FiMail style={{ color: 'var(--color-yellow-primary)', flexShrink: 0 }} />
                        <span>{previewUser.email}</span>
                      </div>
                    )}

                    {/* Gender */}
                    {previewUser.profile?.gender && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e0e0e0', marginBottom: '12px' }}>
                        <FiUser style={{ color: 'var(--color-yellow-primary)', flexShrink: 0 }} />
                        <span>{previewUser.profile.gender}</span>
                      </div>
                    )}

                    {/* Education and College */}
                    {(previewUser.profile?.education || previewUser.profile?.college) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e0e0e0', marginBottom: '12px' }}>
                        <FiBookOpen style={{ color: 'var(--color-yellow-primary)', flexShrink: 0 }} />
                        <span>
                          {previewUser.profile?.education || ''}
                          {previewUser.profile?.education && previewUser.profile?.college ? ' at ' : ''}
                          {previewUser.profile?.college || ''}
                        </span>
                      </div>
                    )}

                    {/* Bio */}
                    <p style={{
                      fontSize: '13px',
                      color: 'var(--color-text-gray)',
                      lineHeight: '1.6',
                      margin: '0 0 16px 0',
                      background: 'rgba(255, 255, 255, 0.01)',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.02)'
                    }}>
                      {previewUser.profile?.bio || 'No bio provided yet.'}
                    </p>

                    {/* Experience Section */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#ffffff',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FiBriefcase style={{ color: 'var(--color-yellow-primary)' }} /> Work Experience
                      </h4>
                      {!previewUser.profile?.experience || previewUser.profile.experience.length === 0 ? (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>No work experience added.</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '16px', marginLeft: '4px' }}>
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: '6px',
                            bottom: '6px',
                            width: '1.5px',
                            background: 'linear-gradient(to bottom, var(--color-yellow-primary), rgba(255, 215, 0, 0.15))',
                            borderRadius: '1px'
                          }} />
                          
                          {previewUser.profile.experience.map((exp, idx) => (
                            <div key={exp._id || idx} style={{ position: 'relative', marginBottom: idx === previewUser.profile.experience!.length - 1 ? 0 : '14px' }}>
                              <div style={{
                                position: 'absolute',
                                left: '-20px',
                                top: '3px',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#000000',
                                border: '1.5px solid var(--color-yellow-primary)',
                                boxShadow: '0 0 6px var(--color-yellow-primary)',
                                zIndex: 2
                              }} />
                              
                              <div>
                                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                                  {exp.title}
                                </h5>
                                <p style={{ fontSize: '11px', color: 'var(--color-yellow-primary)', fontWeight: 600, margin: '1px 0 2px 0' }}>
                                  {exp.company} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>• {exp.location}</span>
                                </p>
                                <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', margin: 0 }}>
                                  {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Skills Section */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#ffffff',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FiAward style={{ color: 'var(--color-yellow-primary)' }} /> Featured Skills
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {previewUser.profile?.skills && previewUser.profile.skills.length > 0 ? (
                          previewUser.profile.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '10px',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 215, 0, 0.15)',
                                background: 'rgba(255, 215, 0, 0.02)',
                                padding: '3px 8px',
                                borderRadius: '4px'
                              }}
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>No skills listed yet.</span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Footer details row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: '16px',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-muted)' }}>
                    <FiUsers />
                    <span>{previewUser.connections?.length || 0} Connections</span>
                  </div>

                  <button
                    onClick={handleViewFullProfile}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-yellow-primary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    View Full Profile &rarr;
                  </button>
                </div>

              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Private Account Request Popup */}
      <AnimatePresence>
        {showPrivatePopup && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              zIndex: 1400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setShowPrivatePopup(false)}
          >
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
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                background: 'rgba(10, 10, 10, 0.96)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-yellow-primary)',
                margin: '0 auto 16px auto',
                border: '1px solid rgba(255, 215, 0, 0.2)'
              }}>
                <FiLock size={26} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)', marginBottom: '8px' }}>
                This Account is Private
              </h3>
              
              <p style={{ fontSize: '13px', color: 'var(--color-text-gray)', lineHeight: '1.6', marginBottom: '24px' }}>
                A connection request will be sent to <strong style={{ color: '#ffffff' }}>{previewUser?.name}</strong> for approval. They will receive a notification and can choose to accept or decline.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowPrivatePopup(false)}
                  className="btn-outline"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    padding: '10px',
                    fontSize: '13px',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendPrivateRequest}
                  disabled={connecting}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    padding: '10px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: connecting ? 0.6 : 1
                  }}
                >
                  {connecting ? <FiLoader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FiUserPlus size={14} />}
                  Send Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Disconnect Confirmation Popup */}
      <AnimatePresence>
        {showDisconnectConfirm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              zIndex: 1400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setShowDisconnectConfirm(false)}
          >
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
                border: '1px solid rgba(255, 107, 107, 0.4)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                background: 'rgba(10, 10, 10, 0.96)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                background: 'rgba(255, 107, 107, 0.1)',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ff6b6b',
                margin: '0 auto 16px auto',
                border: '1px solid rgba(255, 107, 107, 0.2)'
              }}>
                <FiUserMinus size={26} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)', marginBottom: '8px' }}>
                Disconnect from {previewUser?.name}?
              </h3>
              
              <p style={{ fontSize: '13px', color: 'var(--color-text-gray)', lineHeight: '1.6', marginBottom: '24px' }}>
                You will no longer be able to message each other or see private updates. You can reconnect later.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="btn-outline"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    padding: '10px',
                    fontSize: '13px',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={connecting}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    padding: '10px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#ff4444',
                    border: '1px solid #ff4444',
                    color: '#ffffff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    opacity: connecting ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {connecting ? <FiLoader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FiUserMinus size={14} />}
                  Disconnect
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};
