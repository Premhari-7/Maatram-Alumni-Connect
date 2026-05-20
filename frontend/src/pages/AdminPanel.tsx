import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
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
        
        // Find unverified alumni AND students awaiting approval
        const pending = allUsers.filter(u => (u.role === 'alumni' && !u.isVerified) || (u.role === 'student' && !u.isVerified));
        setPendingList(pending);

        // Stats calculation
        setStats({
          totalUsers: allUsers.length,
          scholarsCount: allUsers.filter(u => u.role === 'student').length,
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

  // Reject / Delete account
  const handleRejectAlumni = async (targetUserId: string) => {
    if (isMockMode) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      if (mockUsersStr) {
        const allUsers = JSON.parse(mockUsersStr) as any[];
        const updated = allUsers.filter(u => u._id !== targetUserId);

        localStorage.setItem('mock_db_users', JSON.stringify(updated));
        showNotification('Request Rejected', 'The alumni application has been deleted.', 'success');
        loadAdminData();
      }
    } else {
      try {
        await axios.delete(`${API_URL}/users/admin/delete/${targetUserId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('Request Rejected', 'The alumni application has been deleted.', 'success');
        loadAdminData();
      } catch (err) {
        console.error('Reject failed:', err);
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
        
        {/* Left Column: pending list table */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-title)', marginBottom: '16px' }}>
            Pending Account Verifications
          </h3>

          {loading ? (
            <div style={{ color: 'var(--color-text-gray)', fontSize: '14px' }}>Loading requests...</div>
          ) : pendingList.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
              No accounts awaiting verification. Excellent!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pendingList.map(alumni => (
                <div 
                  key={alumni._id}
                  className="glass-panel admin-list-row"
                  style={{
                    padding: '20px',
                    display: 'grid',
                    gridTemplateColumns: '50px 1.5fr 1fr 1fr',
                    alignItems: 'center',
                    gap: '16px',
                    borderColor: 'rgba(255,215,0,0.12)'
                  }}
                >
                  <img
                    src={alumni.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={alumni.name}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                  />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}>{alumni.name}</h4>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: alumni.role === 'alumni' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(0, 191, 255, 0.15)',
                        color: alumni.role === 'alumni' ? 'var(--color-yellow-primary)' : '#00bfff',
                        border: alumni.role === 'alumni' ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(0, 191, 255, 0.3)'
                      }}>
                        {alumni.role === 'alumni' ? 'Alumni' : 'Scholar'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>{alumni.email}</span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-gray)' }}>
                    <div>Dept: {alumni.profile?.department || 'N/A'}</div>
                    <div>Batch: {alumni.profile?.batch || 'N/A'}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleApproveAlumni(alumni._id)}
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
                    <button
                      onClick={() => handleRejectAlumni(alumni._id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: 'rgba(255, 68, 68, 0.1)',
                        color: '#ff4444',
                        border: '1px solid rgba(255, 68, 68, 0.2)',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
