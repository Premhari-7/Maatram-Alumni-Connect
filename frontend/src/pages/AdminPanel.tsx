import React, { useState, useEffect } from 'react';
import { useAuth, API_URL, DEFAULT_AVATAR } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { FiUsers, FiUserCheck, FiUserX, FiActivity, FiShield, FiFileText } from 'react-icons/fi';
import axios from 'axios';

interface UnverifiedAlumni {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  profile: {
    avatar: string;
    department: string;
    batch: string;
    company: string;
    jobTitle: string;
  };
}

export const AdminPanel = () => {
  const { user, token, isMockMode } = useAuth();
  const { showNotification } = useNotification();

  const [pendingList, setPendingList] = useState<UnverifiedAlumni[]>([]);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'scholar' | 'alumni' | 'admin'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    scholarsCount: 0,
    alumniCount: 0,
    pendingAlumniCount: 0
  });

  const loadAdminData = async () => {
    if (isMockMode) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      if (mockUsersStr) {
        const allUsers = JSON.parse(mockUsersStr) as any[];
        setAllUsersList(allUsers);
        
        // Find unverified alumni AND students awaiting approval
        const pending = allUsers.filter(u => (u.role === 'alumni' && !u.isVerified) || (u.role === 'student' && !u.isVerified));
        setPendingList(pending);

        // Stats calculation
        setStats({
          totalUsers: allUsers.length,
          scholarsCount: allUsers.filter(u => u.role === 'student' && u.isVerified).length,
          alumniCount: allUsers.filter(u => u.role === 'alumni' && u.isVerified).length,
          pendingAlumniCount: pending.length
        });
      }
      setLoading(false);
    } else {
      try {
        const res = await axios.get(`${API_URL}/users/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats({
          totalUsers: res.data.totalUsers || 0,
          scholarsCount: res.data.studentsCount || 0,
          alumniCount: res.data.alumniCount || 0,
          pendingAlumniCount: res.data.unverifiedAlumniCount || 0
        });

        // Use the correct admin endpoint to get ALL users
        const listRes = await axios.get(`${API_URL}/users/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAllUsersList(listRes.data);
        // Show all unverified users (alumni and students who need approval)
        setPendingList(listRes.data.filter((u: any) => (u.role === 'alumni' || u.role === 'student') && !u.isVerified));
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isMockMode]);

  // Approve alumni account
  const handleApproveAlumni = async (targetUserId: string) => {
    if (isMockMode) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      if (mockUsersStr) {
        const allUsers = JSON.parse(mockUsersStr) as any[];
        const updated = allUsers.map(u => {
          if (u._id === targetUserId) {
            return { ...u, isVerified: true };
          }
          return u;
        });

        localStorage.setItem('mock_db_users', JSON.stringify(updated));
        showNotification('Alumni Verified', 'The alumni account has been approved successfully.', 'success');
        loadAdminData();
      }
    } else {
      try {
        await axios.post(`${API_URL}/users/admin/verify/${targetUserId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('Alumni Verified', 'The alumni account has been approved successfully.', 'success');
        loadAdminData();
      } catch (err) {
        console.error('Verify failed:', err);
      }
    }
  };

  // Delete user account
  const handleDeleteUser = async (targetUserId: string, userName: string) => {
    const currentId = user?.id || (user as any)?._id;
    if (targetUserId === currentId) {
      showNotification('Action Blocked', 'You cannot delete your own admin account.', 'warning');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete the account for ${userName}? All their profile data and posts will be removed.`)) {
      return;
    }

    if (isMockMode) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      if (mockUsersStr) {
        const allUsers = JSON.parse(mockUsersStr) as any[];
        const updated = allUsers.filter(u => u._id !== targetUserId && u.id !== targetUserId);
        localStorage.setItem('mock_db_users', JSON.stringify(updated));

        // Delete their posts in mock DB
        const mockPostsStr = localStorage.getItem('mock_db_posts');
        if (mockPostsStr) {
          const posts = JSON.parse(mockPostsStr) as any[];
          const updatedPosts = posts.filter(p => {
            const authorId = p.author?.id || p.author?._id || p.author;
            return authorId !== targetUserId;
          });
          localStorage.setItem('mock_db_posts', JSON.stringify(updatedPosts));
        }

        showNotification('User Deleted', `${userName}'s account and posts have been removed (Mock).`, 'success');
        loadAdminData();
      }
    } else {
      try {
        await axios.delete(`${API_URL}/users/admin/delete/${targetUserId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('User Deleted', `${userName}'s account has been successfully removed.`, 'success');
        loadAdminData();
      } catch (err: any) {
        console.error('Delete failed:', err);
        showNotification('Error', err.response?.data?.message || 'Failed to delete user.', 'error');
      }
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Unauthorized Access</h2>
        <p>This workspace is restricted to system administrators only.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      
      {/* Header title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-title)' }}>
          Moderator Panel
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', marginTop: '4px' }}>
          Manage user profiles, verify alumni registrations, and view platform metrics.
        </p>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '35px'
      }} className="admin-stats-grid">
        {[
          { label: 'Total Registered', count: stats.totalUsers, icon: <FiUsers /> },
          { label: 'Verified Scholars', count: stats.scholarsCount, icon: <FiUserCheck /> },
          { label: 'Verified Alumni', count: stats.alumniCount, icon: <FiShield /> },
          { label: 'Pending Approvals', count: stats.pendingAlumniCount, icon: <FiUserX /> }
        ].map((stat, i) => (
          <div key={i} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: i === 3 && stats.pendingAlumniCount > 0 ? 'var(--color-yellow-primary)' : 'rgba(255,215,0,0.08)' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-gray)' }}>{stat.label}</span>
              <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', fontFamily: 'var(--font-title)' }}>{stat.count}</h2>
            </div>
            
            <div style={{
              background: i === 3 && stats.pendingAlumniCount > 0 ? 'rgba(255,215,0,0.15)' : 'rgba(255, 215, 0, 0.08)',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-yellow-primary)'
            }}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '30px' }} className="admin-body-grid">
        
        {/* Left Column: users list table with tabs and search */}
        <div>
          {/* Tabs header */}
          <div style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '10px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'pending', label: 'Pending Approvals', count: allUsersList.filter(u => !u.isVerified && (u.role === 'alumni' || u.role === 'student')).length },
              { id: 'scholar', label: 'Scholars', count: allUsersList.filter(u => u.isVerified && u.role === 'student').length },
              { id: 'alumni', label: 'Alumni', count: allUsersList.filter(u => u.isVerified && u.role === 'alumni').length },
              { id: 'admin', label: 'System Admins', count: allUsersList.filter(u => u.role === 'admin').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); }}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid',
                  borderColor: activeTab === tab.id ? 'var(--color-yellow-primary)' : 'rgba(255, 255, 255, 0.15)',
                  background: activeTab === tab.id ? 'var(--color-yellow-primary)' : 'transparent',
                  color: activeTab === tab.id ? '#000000' : '#ffffff',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: activeTab === tab.id ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)',
                  color: activeTab === tab.id ? '#000000' : 'var(--color-text-gray)',
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search users by name, email, department, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 215, 0, 0.15)',
                background: 'rgba(0, 0, 0, 0.4)',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-yellow-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 215, 0, 0.15)'}
            />
          </div>

          {loading ? (
            <div style={{ color: 'var(--color-text-gray)', fontSize: '14px' }}>Loading requests...</div>
          ) : (
            (() => {
              const filteredUsers = allUsersList.filter(u => {
                // Tab filter
                if (activeTab === 'pending') {
                  if (u.isVerified) return false;
                  if (u.role !== 'alumni' && u.role !== 'student') return false;
                } else if (activeTab === 'scholar') {
                  if (!u.isVerified || u.role !== 'student') return false;
                } else if (activeTab === 'alumni') {
                  if (!u.isVerified || u.role !== 'alumni') return false;
                } else if (activeTab === 'admin') {
                  if (u.role !== 'admin') return false;
                }

                // Search query filter
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  const name = (u.name || '').toLowerCase();
                  const email = (u.email || '').toLowerCase();
                  const dept = (u.profile?.department || '').toLowerCase();
                  const company = (u.profile?.company || '').toLowerCase();
                  const job = (u.profile?.jobTitle || '').toLowerCase();
                  return name.includes(q) || email.includes(q) || dept.includes(q) || company.includes(q) || job.includes(q);
                }

                return true;
              });

              if (filteredUsers.length === 0) {
                return (
                  <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
                    No matching users found.
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredUsers.map(member => {
                    const memberId = member._id || member.id;
                    const isSelf = memberId === user?.id || memberId === (user as any)?._id;
                    const showApprove = !member.isVerified && (member.role === 'alumni' || member.role === 'student');

                    return (
                      <div 
                        key={memberId}
                        className="glass-panel admin-list-row"
                        style={{
                          padding: '20px',
                          display: 'grid',
                          gridTemplateColumns: '50px 1.5fr 1fr 1fr',
                          alignItems: 'center',
                          gap: '16px',
                          borderColor: isSelf ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255,215,0,0.12)'
                        }}
                      >
                        <img
                          src={member.profile?.avatar || DEFAULT_AVATAR}
                          alt={member.name}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        />

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                              {member.name} {isSelf && <span style={{ color: 'var(--color-yellow-primary)', fontSize: '10px' }}>(You)</span>}
                            </h4>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: member.role === 'admin' ? 'rgba(255, 68, 68, 0.15)' : member.role === 'alumni' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(0, 191, 255, 0.15)',
                              color: member.role === 'admin' ? '#ff4444' : member.role === 'alumni' ? 'var(--color-yellow-primary)' : '#00bfff',
                              border: member.role === 'admin' ? '1px solid rgba(255, 68, 68, 0.3)' : member.role === 'alumni' ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(0, 191, 255, 0.3)'
                            }}>
                              {member.role === 'admin' ? 'Admin' : member.role === 'alumni' ? 'Alumni' : 'Scholar'}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>{member.email}</span>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--color-text-gray)' }}>
                          {member.role !== 'admin' ? (
                            <>
                              <div>Dept: {member.profile?.department || 'N/A'}</div>
                              <div>Batch: {member.profile?.batch || 'N/A'}</div>
                            </>
                          ) : (
                            <div style={{ color: 'var(--color-text-muted)' }}>System Administrator</div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {showApprove && (
                            <button
                              onClick={() => handleApproveAlumni(memberId)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: 'var(--color-yellow-primary)',
                                color: '#000000',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(memberId, member.name)}
                            disabled={isSelf || (member.role === 'admin' && !isMockMode)}
                            title={isSelf ? "You cannot delete yourself" : (member.role === 'admin' && !isMockMode) ? "System administrators cannot be deleted" : "Delete user"}
                            style={{
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: (isSelf || (member.role === 'admin' && !isMockMode)) ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 68, 68, 0.1)',
                              color: (isSelf || (member.role === 'admin' && !isMockMode)) ? 'rgba(255, 255, 255, 0.2)' : '#ff4444',
                              border: (isSelf || (member.role === 'admin' && !isMockMode)) ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(255, 68, 68, 0.2)',
                              borderRadius: '6px',
                              cursor: (isSelf || (member.role === 'admin' && !isMockMode)) ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>

        {/* Right Column: admin guidelines panel */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-title)', marginBottom: '16px' }}>
            Moderator Guidelines
          </h3>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', borderColor: 'rgba(255,215,0,0.08)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-yellow-primary)' }}>Alumni Verification Check</h4>
            <p style={{ fontSize: '12px', color: 'var(--color-text-gray)', lineHeight: '1.6' }}>
              Confirm alumni identities by cross-referencing batch years and departments with Maatram student records. Keep connection gates secure.
            </p>
            <div style={{ borderTop: '1px solid var(--color-border-glass)', paddingTop: '12px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Restricted Area
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 900px) {
          .admin-stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .admin-body-grid {
            grid-template-columns: 1fr !important;
          }
          .admin-list-row {
            grid-template-columns: 50px 1.5fr 1fr !important;
          }
          .admin-list-row > div:last-child {
            grid-column: span 3;
            justify-content: flex-start !important;
            margin-top: 10px;
          }
        }
        @media (max-width: 600px) {
          .admin-stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
};
export default AdminPanel;
