import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FloatingCapLogo } from './FloatingCapLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiGrid, 
  FiFileText, 
  FiUsers, 
  FiMessageSquare, 
  FiCalendar, 
  FiBriefcase, 
  FiBell, 
  FiUser, 
  FiSettings, 
  FiLogOut 
} from 'react-icons/fi';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) return null;

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <FiGrid size={18} />, end: true },
    { name: 'Feed', path: '/dashboard/feed', icon: <FiFileText size={18} /> },
    { name: 'Connections', path: '/dashboard/connections', icon: <FiUsers size={18} /> },
    { name: 'Messages', path: '/dashboard/chat', icon: <FiMessageSquare size={18} /> },
    { name: 'Events', path: '/dashboard/events', icon: <FiCalendar size={18} /> },
    { name: 'Profile', path: `/dashboard/profile/${user.id || (user as any)._id}`, icon: <FiUser size={18} /> },
    { name: 'Settings', path: '/dashboard/settings', icon: <FiSettings size={18} /> }
  ];

  // If user is Admin, insert Admin Panel before Settings
  if (user.role === 'admin') {
    navItems.splice(5, 0, {
      name: 'Admin Panel',
      path: '/dashboard/admin',
      icon: <FiBriefcase size={18} />
    });
  }

  return (
    <>
      <div 
        className="glass-panel"
        style={{
          width: '260px',
          height: 'calc(100vh - 40px)',
          position: 'sticky',
          top: '20px',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          zIndex: 100,
          gap: '28px',
          borderColor: 'rgba(255, 215, 0, 0.1)'
        }}
      >
        {/* Brand logo header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '8px' }}>
          <FloatingCapLogo size={38} />
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', letterSpacing: '1px', margin: 0, fontFamily: 'var(--font-title)' }}>
              MAATRAM
            </h2>
            <span style={{ fontSize: '10px', color: 'var(--color-yellow-primary)', fontWeight: 500, letterSpacing: '0.5px' }}>
              ALUMNI CONNECT
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                color: isActive ? '#000000' : 'var(--color-text-gray)',
                backgroundColor: isActive ? 'var(--color-yellow-primary)' : 'transparent',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                fontFamily: 'var(--font-title)',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 15px rgba(255, 215, 0, 0.2)' : 'none',
                border: isActive ? '1px solid var(--color-yellow-primary)' : '1px solid transparent'
              })}
              onMouseEnter={(e) => {
                // Only hover if not active
                if (!e.currentTarget.style.backgroundColor || e.currentTarget.style.backgroundColor === 'transparent') {
                  e.currentTarget.style.color = '#ffd700';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (e.currentTarget.className.includes('active') || e.currentTarget.style.color === 'rgb(0, 0, 0)') {
                  // Keep active state
                } else {
                  e.currentTarget.style.color = 'var(--color-text-gray)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User tag & Logout */}
        <div style={{
          borderTop: '1px solid var(--color-border-glass)',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {/* User tag info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px' }}>
            <img
              src={user.profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={user.name}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--color-yellow-primary)',
                boxShadow: '0 0 6px var(--color-yellow-glow-subtle)'
              }}
            />
            <div style={{ overflow: 'hidden' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.name}
              </h4>
              <span style={{ fontSize: '10px', color: 'var(--color-text-gray)', textTransform: 'capitalize' }}>
                {user.role}
              </span>
            </div>
          </div>

          {/* Logout action */}
          <button
            onClick={handleLogoutClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              color: '#ff4444',
              backgroundColor: 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'var(--font-title)',
              fontWeight: 500,
              textAlign: 'left',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 68, 68, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <FiLogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
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
            onClick={() => setShowLogoutConfirm(false)}
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
                background: 'rgba(10, 10, 10, 0.95)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                background: 'rgba(255, 68, 68, 0.1)',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ff4444',
                margin: '0 auto 16px auto',
                border: '1px solid rgba(255, 68, 68, 0.2)'
              }}>
                <FiLogOut size={26} />
              </div>
              
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)', marginBottom: '8px' }}>
                Confirm Sign Out
              </h3>
              
              <p style={{ fontSize: '13px', color: 'var(--color-text-gray)', lineHeight: '1.6', marginBottom: '24px' }}>
                Are you sure you want to sign out from Maatram Connect? You will need to enter your credentials to log in again.
              </p>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
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
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                    navigate('/');
                  }}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    padding: '10px',
                    fontSize: '13px',
                    background: '#ff4444',
                    borderColor: '#ff4444',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(255, 68, 68, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ff2222';
                    e.currentTarget.style.borderColor = '#ff2222';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ff4444';
                    e.currentTarget.style.borderColor = '#ff4444';
                  }}
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
