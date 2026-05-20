import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { AIChatbot } from './AIChatbot';
import { Footer } from './Footer';
import { FiLoader, FiLock, FiLogOut } from 'react-icons/fi';

export const DashboardLayout = () => {
  const { user, loading, logout } = useAuth();

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

      {/* Right Column: Main Content + Cinematic Footer */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        minWidth: 0
      }}>
        {/* Main Content Area */}
        <main style={{
          flex: 1
        }}>
          <Outlet />
        </main>
      </div>

      {/* Floating AI Assistant Chatbot */}
      <AIChatbot />
    </div>
  );
};
