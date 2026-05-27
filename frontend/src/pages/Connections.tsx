import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API_URL, DEFAULT_AVATAR } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiFilter, FiUserCheck, FiUserPlus, FiMessageSquare, FiSliders, FiLoader, FiLock, FiClock, FiX, FiUsers, FiUserMinus, FiShield } from 'react-icons/fi';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileUser {
  _id: string;
  id?: string;
  name: string;
  role: string;
  email: string;
  isPrivate?: boolean;
  profile: {
    avatar: string;
    bio: string;
    skills: string[];
    department: string;
    batch: string;
    company: string;
    jobTitle: string;
  };
  connections: string[];
}

type ConnectionStatus = 'connected' | 'pending_sent' | 'pending_received' | 'none';

interface PendingRequest {
  _id: string;
  sender: ProfileUser;
  receiver: ProfileUser;
  status: string;
  createdAt: string;
}

export const Connections = () => {
  const { user, token, refreshUser } = useAuth();
  const { showNotification } = useNotification();
  const { fetchNotifications } = useSocket();
  const navigate = useNavigate();

  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatuses, setConnectionStatuses] = useState<{ [userId: string]: ConnectionStatus }>({});
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'directory' | 'pending'>('directory');

  // Popup states
  const [connectPopup, setConnectPopup] = useState<{ show: boolean; user: ProfileUser | null; isPrivate: boolean }>({ show: false, user: null, isPrivate: false });
  const [disconnectPopup, setDisconnectPopup] = useState<{ show: boolean; user: ProfileUser | null }>({ show: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'student' | 'alumni'>('all');
  const [filterDept, setFilterDept] = useState('all');
 

  const fetchUsers = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userId = user?.id || (user as any)?._id;
      setUsers((res.data || []).filter((u: any) => u._id !== userId));
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  const fetchConnectionStatuses = useCallback(async () => {
    if (!user) return;
    const statuses: { [userId: string]: ConnectionStatus } = {};
    
    for (const u of users) {
      try {
        const res = await axios.get(`${API_URL}/connections/status/${u._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        statuses[u._id] = res.data.status;
      } catch {
        statuses[u._id] = 'none';
      }
    }
    setConnectionStatuses(statuses);
  }, [users, user, token]);

  const fetchPendingRequests = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/connections/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingRequests(res.data || []);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
      setPendingRequests([]);
    }
  }, [user, token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (users.length > 0) {
      fetchConnectionStatuses();
      fetchPendingRequests();
    }
  }, [users, fetchConnectionStatuses, fetchPendingRequests]);

  // Get connection status
  const getConnectionStatus = (targetUserId: string): ConnectionStatus => {
    return connectionStatuses[targetUserId] || (user?.connections?.includes(targetUserId) ? 'connected' : 'none');
  };

  // Handle connect button click
  const handleConnectClick = (targetUser: ProfileUser) => {
    const status = getConnectionStatus(targetUser._id || targetUser.id || '');
    if (status === 'connected') {
      setDisconnectPopup({ show: true, user: targetUser });
    } else if (status === 'pending_sent') {
      showNotification('Request Pending', 'Your connection request is already pending approval.', 'info');
    } else {
      const isPrivate = (targetUser.isPrivate && targetUser.role !== 'admin') || false;
      setConnectPopup({ show: true, user: targetUser, isPrivate });
    }
  };

  // Send connection request
  const handleSendConnectionRequest = async () => {
    if (!connectPopup.user) return;
    setActionLoading(true);
    const targetId = connectPopup.user._id || connectPopup.user.id;

    try {
      const res = await axios.post(`${API_URL}/connections/request`, { targetUserId: targetId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status === 'pending') {
        setConnectionStatuses(prev => ({ ...prev, [targetId!]: 'pending_sent' }));
        showNotification('Request Sent', 'Connection request sent. Waiting for approval.', 'info');
      } else {
        setConnectionStatuses(prev => ({ ...prev, [targetId!]: 'connected' }));
        refreshUser();
        showNotification('Connected', `You are now connected with ${connectPopup.user?.name}!`, 'success');
      }
    } catch (err: any) {
      showNotification('Error', err.response?.data?.message || 'Failed to send connection request.', 'error');
    }
    setActionLoading(false);
    setConnectPopup({ show: false, user: null, isPrivate: false });
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!disconnectPopup.user) return;
    setActionLoading(true);
    const targetId = disconnectPopup.user._id || disconnectPopup.user.id;

    try {
      await axios.post(`${API_URL}/connections/disconnect/${targetId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnectionStatuses(prev => ({ ...prev, [targetId!]: 'none' }));
      refreshUser();
      showNotification('Disconnected', `You have disconnected from ${disconnectPopup.user?.name}.`, 'info');
    } catch (err: any) {
      showNotification('Error', err.response?.data?.message || 'Failed to disconnect.', 'error');
    }
    setActionLoading(false);
    setDisconnectPopup({ show: false, user: null });
  };

  // Accept pending request
  const handleAcceptRequest = async (request: PendingRequest) => {
    try {
      await axios.post(`${API_URL}/connections/accept/${request._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      refreshUser();
      fetchPendingRequests();
      fetchConnectionStatuses();
      fetchNotifications();
      showNotification('Connected', `You are now connected with ${request.sender?.name}!`, 'success');
    } catch (err) {
      console.error('Error accepting request:', err);
      showNotification('Error', 'Failed to accept connection request.', 'error');
    }
  };

  // Reject pending request
  const handleRejectRequest = async (request: PendingRequest) => {
    try {
      await axios.post(`${API_URL}/connections/reject/${request._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPendingRequests();
      showNotification('Rejected', 'Connection request has been declined.', 'info');
    } catch (err) {
      console.error('Error rejecting request:', err);
      showNotification('Error', 'Failed to reject connection request.', 'error');
    }
  };

  // Navigate to profile
  const handleProfileClick = (id: string) => {
    navigate(`/dashboard/profile/${id}`);
  };

  // Start Chat messaging
  const handleStartChat = (targetUser: ProfileUser) => {
    const targetId = targetUser._id || targetUser.id;
    const status = getConnectionStatus(targetId || '');
    if (targetUser.isPrivate && targetUser.role !== 'admin' && status !== 'connected') {
      showNotification('Private Account', 'You need to be connected with this user to send messages.', 'warning');
      return;
    }
    navigate(`/dashboard/chat?active=${targetId}`);
  };

  // Get status button content
  const getStatusButton = (targetUser: ProfileUser) => {
    const targetId = targetUser._id || targetUser.id || '';
    const status = getConnectionStatus(targetId);

    switch (status) {
      case 'connected':
        return { icon: <FiUserMinus />, text: 'Remove Connection', style: 'connected' as const };
      case 'pending_sent':
        return { icon: <FiClock />, text: 'Pending', style: 'pending' as const };
      case 'pending_received':
        return { icon: <FiUserPlus />, text: 'Respond', style: 'respond' as const };
      default:
        return { icon: <FiUserPlus />, text: 'Connect', style: 'connect' as const };
    }
  };

  // Filtered Users List
  const filteredUsers = (users || []).filter(u => {
    if (!u) return false;
    const query = search.toLowerCase();
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(query) ||
      (u.profile?.skills && u.profile.skills.some(sk => (sk || '').toLowerCase().includes(query))) ||
      (u.profile?.company && u.profile.company.toLowerCase().includes(query)) ||
      (u.profile?.department && u.profile.department.toLowerCase().includes(query));

    const matchesRole = filterRole === 'all' ? true : u.role === filterRole;
    const matchesDept = filterDept === 'all' ? true : u.profile?.department === filterDept;

    return matchesSearch && matchesRole && matchesDept;
  });

  // Safety: if user is null, show loading
  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
        <FiLoader size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      {/* Header section */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-title)' }}>
          Connections Directory
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', marginTop: '4px' }}>
          Search and connect with scholars, alumni, and administrators in the Maatram community.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('directory')}
          style={{
            padding: '8px 20px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '8px',
            cursor: 'pointer',
            border: '1px solid',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeTab === 'directory' ? 'var(--color-yellow-primary)' : 'transparent',
            color: activeTab === 'directory' ? '#000000' : 'var(--color-text-gray)',
            borderColor: activeTab === 'directory' ? 'var(--color-yellow-primary)' : 'rgba(255,255,255,0.1)'
          }}
        >
          <FiUsers size={14} /> All Members
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '8px 20px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '8px',
            cursor: 'pointer',
            border: '1px solid',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            position: 'relative',
            background: activeTab === 'pending' ? 'var(--color-yellow-primary)' : 'transparent',
            color: activeTab === 'pending' ? '#000000' : 'var(--color-text-gray)',
            borderColor: activeTab === 'pending' ? 'var(--color-yellow-primary)' : 'rgba(255,255,255,0.1)'
          }}
        >
          <FiClock size={14} /> Connection Requests
          {pendingRequests.length > 0 && (
            <span style={{
              background: '#ff4444',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '10px',
              marginLeft: '2px'
            }}>
              {pendingRequests.length}
            </span>
          )}
        </button>

      </div>

      {/* Pending Requests Tab */}
      {activeTab === 'pending' && (
        <div>
          {pendingRequests.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
              <FiClock size={28} style={{ marginBottom: '12px', color: 'var(--color-text-muted)' }} />
              <p>No pending connection requests.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingRequests.map((req) => (
                <motion.div
                  key={req._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    borderColor: 'rgba(255, 215, 0, 0.12)'
                  }}
                >
                  <img
                    src={req.sender?.profile?.avatar || DEFAULT_AVATAR}
                    alt={req.sender?.name}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid var(--color-yellow-primary)',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleProfileClick(req.sender?._id)}
                  />
                  <div style={{ flex: 1 }}>
                    <h4
                      style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', cursor: 'pointer', margin: 0 }}
                      onClick={() => handleProfileClick(req.sender?._id)}
                    >
                      {req.sender?.name}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-gray)' }}>
                      {req.sender?.role === 'student' ? 'Scholar' : req.sender?.role} • {req.sender?.profile?.department || 'Unknown Dept'}
                    </span>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Sent {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      style={{
                        padding: '7px 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: 'var(--color-yellow-primary)',
                        color: '#000000',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <FiUserCheck size={14} /> Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req)}
                      style={{
                        padding: '7px 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: 'transparent',
                        color: '#ff6b6b',
                        border: '1px solid rgba(255, 107, 107, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <FiX size={14} /> Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Directory Tab */}
      {activeTab === 'directory' && (
        <>
          {/* Filter panel */}
          <div 
            className="glass-panel"
            style={{
              padding: '16px 20px',
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '30px',
              borderColor: 'rgba(255, 215, 0, 0.08)'
            }}
          >
            {/* Search bar */}
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                placeholder="Search by name, skills, batch, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 42px',
                  background: 'rgba(10, 10, 10, 0.7)',
                  border: '1px solid var(--color-border-glass)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Role Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiFilter /> Role
              </span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                style={{
                  background: 'rgba(10, 10, 10, 0.7)',
                  border: '1px solid var(--color-border-glass)',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="all">All Roles</option>
                <option value="student">Scholars</option>
                <option value="alumni">Alumni</option>
              </select>
            </div>

            {/* Department Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiSliders /> Department
              </span>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                style={{
                  background: 'rgba(10, 10, 10, 0.7)',
                  border: '1px solid var(--color-border-glass)',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="all">All Depts</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Nursing">Nursing</option>
                <option value="Arts & Science">Arts & Science</option>
              </select>
            </div>
          </div>

          {/* Grid listing */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--color-text-gray)', fontSize: '14px', gap: '10px' }}>
              <FiLoader size={20} style={{ animation: 'spin 1s linear infinite' }} />
              Loading directory...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
              No connections found matching your filter criteria.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px'
            }} className="connections-grid">
              {filteredUsers.map(u => {
                const targetId = u._id || u.id || '';
                const statusBtn = getStatusButton(u);
                
                return (
                  <motion.div
                    key={targetId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="glass-panel hover-card"
                    style={{
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      borderColor: 'rgba(255, 215, 0, 0.08)'
                    }}
                  >
                    {/* Details briefly */}
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={u.profile?.avatar || DEFAULT_AVATAR}
                          alt={u.name}
                          onClick={() => handleProfileClick(targetId)}
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1.5px solid var(--color-yellow-primary)',
                            cursor: 'pointer'
                          }}
                        />
                        {u.isPrivate && u.role !== 'admin' && (
                          <div style={{
                            position: 'absolute',
                            bottom: '-1px',
                            right: '-1px',
                            background: '#0a0a0a',
                            border: '1px solid rgba(255, 215, 0, 0.3)',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <FiLock size={9} style={{ color: 'var(--color-yellow-primary)' }} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 
                          onClick={() => handleProfileClick(targetId)}
                          style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', cursor: 'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-yellow-primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                        >
                          {u.name}
                        </h3>
                        
                        <span style={{
                          display: 'inline-block',
                          fontSize: '10px',
                          fontWeight: 600,
                          background: u.role === 'alumni' ? 'rgba(255, 215, 0, 0.12)' : 'rgba(255,255,255,0.08)',
                          color: u.role === 'alumni' ? 'var(--color-yellow-primary)' : 'rgba(255,255,255,0.8)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          marginTop: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {u.role === 'student' ? 'scholar' : u.role}
                        </span>
                      </div>
                    </div>

                    {/* Info bullets */}
                    <div style={{ fontSize: '12px', color: 'var(--color-text-gray)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {u.profile?.department && <div>Dept: {u.profile.department}</div>}
                      {u.profile?.batch && <div>Batch: {u.profile.batch}</div>}
                      {u.role === 'alumni' && u.profile?.company && (
                        <div style={{ color: 'var(--color-yellow-primary)', fontWeight: 500 }}>
                          Works at: {u.profile.company}
                        </div>
                      )}
                    </div>

                    {/* Skills tags */}
                    {u.profile?.skills && u.profile.skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {u.profile.skills.slice(0, 3).map((sk, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '10px',
                              color: 'var(--color-text-gray)',
                              border: '1px solid var(--color-border-glass-hover)',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}
                          >
                            {sk}
                          </span>
                        ))}
                        {u.profile.skills.length > 3 && (
                          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                            +{u.profile.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer action buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      marginTop: 'auto',
                      borderTop: '1px solid var(--color-border-glass)',
                      paddingTop: '16px'
                    }}>
                      <button
                        onClick={() => handleConnectClick(u)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          background: statusBtn.style === 'connect' ? 'var(--color-yellow-primary)' :
                                     statusBtn.style === 'pending' ? 'rgba(255, 215, 0, 0.08)' : 'transparent',
                          color: statusBtn.style === 'connect' ? '#000000' :
                                 statusBtn.style === 'pending' ? 'var(--color-yellow-primary)' : 'var(--color-yellow-primary)',
                          border: statusBtn.style === 'connect' ? '1px solid transparent' :
                                  '1px solid var(--color-yellow-primary)',
                          opacity: statusBtn.style === 'pending' ? 0.7 : 1
                        }}
                      >
                        {statusBtn.icon} {statusBtn.text}
                      </button>

                      <button
                        onClick={() => handleStartChat(u)}
                        className="btn-outline"
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          opacity: u.isPrivate && u.role !== 'admin' && getConnectionStatus(targetId) !== 'connected' ? 0.4 : 1
                        }}
                      >
                        <FiMessageSquare /> Message
                      </button>
                    </div>

                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Connect Confirmation Popup */}
      <AnimatePresence>
        {connectPopup.show && connectPopup.user && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setConnectPopup({ show: false, user: null, isPrivate: false })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel"
              style={{
                width: '90%',
                maxWidth: '420px',
                padding: '30px 24px',
                textAlign: 'center',
                border: '1px solid var(--color-yellow-primary)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                background: 'rgba(10, 10, 10, 0.95)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {connectPopup.isPrivate ? (
                <>
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
                    Private Account
                  </h3>
                  
                  <p style={{ fontSize: '13px', color: 'var(--color-text-gray)', lineHeight: '1.6', marginBottom: '6px' }}>
                    <strong style={{ color: '#ffffff' }}>{connectPopup.user.name}</strong>'s account is private.
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
                    A connection request will be sent for their approval. They will be notified and can choose to accept or decline.
                  </p>
                </>
              ) : (
                <>
                  <img
                    src={connectPopup.user.profile?.avatar || DEFAULT_AVATAR}
                    alt={connectPopup.user.name}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--color-yellow-primary)',
                      margin: '0 auto 16px auto',
                      display: 'block'
                    }}
                  />

                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)', marginBottom: '8px' }}>
                    Connect with {connectPopup.user.name}?
                  </h3>
                  
                  <p style={{ fontSize: '13px', color: 'var(--color-text-gray)', lineHeight: '1.6', marginBottom: '24px' }}>
                    You'll be able to message each other and see each other's updates.
                  </p>
                </>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setConnectPopup({ show: false, user: null, isPrivate: false })}
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
                  onClick={handleSendConnectionRequest}
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    padding: '10px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                >
                  {actionLoading ? <FiLoader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FiUserPlus size={14} />}
                  {connectPopup.isPrivate ? 'Send Request' : 'Connect'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Disconnect Confirmation Popup */}
      <AnimatePresence>
        {disconnectPopup.show && disconnectPopup.user && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setDisconnectPopup({ show: false, user: null })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel"
              style={{
                width: '90%',
                maxWidth: '420px',
                padding: '30px 24px',
                textAlign: 'center',
                border: '1px solid rgba(255, 107, 107, 0.4)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                background: 'rgba(10, 10, 10, 0.95)'
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
                Disconnect from {disconnectPopup.user.name}?
              </h3>
              
              <p style={{ fontSize: '13px', color: 'var(--color-text-gray)', lineHeight: '1.6', marginBottom: '24px' }}>
                You will no longer be able to message each other or see private updates. You can reconnect later.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setDisconnectPopup({ show: false, user: null })}
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
                  disabled={actionLoading}
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
                    opacity: actionLoading ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {actionLoading ? <FiLoader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FiUserMinus size={14} />}
                  Disconnect
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 1024px) {
          .connections-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .connections-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
};
export default Connections;
