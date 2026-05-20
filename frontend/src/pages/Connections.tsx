import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiFilter, FiUserCheck, FiUserPlus, FiMessageSquare, FiSliders } from 'react-icons/fi';
import axios from 'axios';

interface ProfileUser {
  _id: string;
  name: string;
  role: string;
  email: string;
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

export const Connections = () => {
  const { user, token, isMockMode, refreshUser } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'student' | 'alumni'>('all');
  const [filterDept, setFilterDept] = useState('all');

  const fetchUsers = async () => {
    if (isMockMode) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      if (mockUsersStr) {
        const list = JSON.parse(mockUsersStr) as ProfileUser[];
        // Filter out current user from listing
        setUsers(list.filter(u => u._id !== user?.id));
      }
      setLoading(false);
    } else {
      try {
        const res = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Filter out current user
        setUsers(res.data.filter((u: any) => u._id !== user?.id));
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isMockMode, user?.id]);

  // Connect Toggle
  const handleConnectToggle = async (targetUserId: string) => {
    if (isMockMode) {
      // Toggle locally
      const mockUsersStr = localStorage.getItem('mock_db_users');
      const currentUserStr = localStorage.getItem('mock_db_current_user');
      if (mockUsersStr && currentUserStr) {
        const allUsers = JSON.parse(mockUsersStr) as ProfileUser[];
        const curr = JSON.parse(currentUserStr);

        const updatedUsers = allUsers.map(u => {
          if (u._id === targetUserId) {
            const connected = u.connections.includes(curr._id);
            const connectionsList = connected 
              ? u.connections.filter(id => id !== curr._id)
              : [...u.connections, curr._id];
            return { ...u, connections: connectionsList };
          }
          if (u._id === curr._id) {
            const connected = u.connections.includes(targetUserId);
            const connectionsList = connected 
              ? u.connections.filter(id => id !== targetUserId)
              : [...u.connections, targetUserId];
            return { ...u, connections: connectionsList };
          }
          return u;
        });

        // Update current user locally
        const connected = curr.connections.includes(targetUserId);
        curr.connections = connected
          ? curr.connections.filter((id: string) => id !== targetUserId)
          : [...curr.connections, targetUserId];

        localStorage.setItem('mock_db_users', JSON.stringify(updatedUsers));
        localStorage.setItem('mock_db_current_user', JSON.stringify(curr));

        // Sync local view
        setUsers(updatedUsers.filter(u => u._id !== curr._id));
        refreshUser(); // refresh auth context user

        showNotification(
          connected ? 'Connection Removed' : 'Connected Successfully',
          connected ? 'You are no longer connected.' : 'You can now message them in real-time.',
          'success'
        );
      }
    } else {
      try {
        const res = await axios.post(`${API_URL}/users/connect/${targetUserId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('Connection Updated', 'Your connection request has been processed.', 'success');
        refreshUser();
        fetchUsers();
      } catch (err) {
        console.error('Error connecting:', err);
      }
    }
  };

  // Navigate to profile
  const handleProfileClick = (id: string) => {
    navigate(`/dashboard/profile/${id}`);
  };

  // Start Chat messaging
  const handleStartChat = (targetUserId: string) => {
    // Navigate to Chat page, passing the user ID via state or query parameter
    navigate(`/dashboard/chat?active=${targetUserId}`);
  };

  // Filtered Users List
  const filteredUsers = users.filter(u => {
    // Search keyword match
    const query = search.toLowerCase();
    const matchesSearch = 
      u.name.toLowerCase().includes(query) ||
      (u.profile?.skills && u.profile.skills.some(sk => sk.toLowerCase().includes(query))) ||
      (u.profile?.company && u.profile.company.toLowerCase().includes(query)) ||
      (u.profile?.department && u.profile.department.toLowerCase().includes(query));

    // Role filter match
    const matchesRole = filterRole === 'all' ? true : u.role === filterRole;

    // Dept filter match
    const matchesDept = filterDept === 'all' ? true : u.profile?.department === filterDept;

    return matchesSearch && matchesRole && matchesDept;
  });

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
        <div style={{ color: 'var(--color-text-gray)', fontSize: '14px' }}>Loading directory...</div>
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
            const isConnected = user?.connections.includes(u._id) || false;
            
            return (
              <div
                key={u._id}
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
                  <img
                    src={u.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={u.name}
                    onClick={() => handleProfileClick(u._id)}
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid var(--color-yellow-primary)',
                      cursor: 'pointer'
                    }}
                  />
                  <div>
                    <h3 
                      onClick={() => handleProfileClick(u._id)}
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
                    onClick={() => handleConnectToggle(u._id)}
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
                      background: isConnected ? 'transparent' : 'var(--color-yellow-primary)',
                      color: isConnected ? 'var(--color-yellow-primary)' : '#000000',
                      border: isConnected ? '1px solid var(--color-yellow-primary)' : '1px solid transparent'
                    }}
                  >
                    {isConnected ? (
                      <>
                        <FiUserCheck /> Connected
                      </>
                    ) : (
                      <>
                        <FiUserPlus /> Connect
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleStartChat(u._id)}
                    className="btn-outline"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  >
                    <FiMessageSquare /> Message
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

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
      `}</style>

    </div>
  );
};
export default Connections;
