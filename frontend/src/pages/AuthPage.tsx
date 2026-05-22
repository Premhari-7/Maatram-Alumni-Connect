import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { TreeAnimation } from '../components/TreeAnimation';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiChevronDown, FiShield, FiHeart } from 'react-icons/fi';
import confetti from 'canvas-confetti';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
  opacity: number;
}

export const AuthPage = () => {
  const { login, register } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'student' | 'alumni' | 'admin'>('student');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretAdminCode, setSecretAdminCode] = useState('');

  // Mini-Branding particle states
  const [authParticles, setAuthParticles] = useState<Particle[]>([]);
  const [showAuthCelebration, setShowAuthCelebration] = useState(false);

  const triggerAuthCelebration = () => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: Date.now() + i + Math.random(),
        x: 0,
        y: 0,
        color: ['#ffd700', '#ffdf00', '#ffc700', '#ffffff'][Math.floor(Math.random() * 4)],
        size: Math.random() * 4 + 2.5,
        angle: Math.random() * 360,
        speed: Math.random() * 4 + 2,
        opacity: 1
      });
    }
    setAuthParticles(newParticles);
    setShowAuthCelebration(true);
    setTimeout(() => setShowAuthCelebration(false), 1500);
  };

  useEffect(() => {
    if (authParticles.length === 0) return;
    const interval = setInterval(() => {
      setAuthParticles(prev => prev
        .map(p => {
          const rad = (p.angle * Math.PI) / 180;
          return {
            ...p,
            x: p.x + Math.cos(rad) * p.speed,
            y: p.y + Math.sin(rad) * p.speed - 0.3,
            opacity: p.opacity - 0.025,
            speed: p.speed * 0.94
          };
        })
        .filter(p => p.opacity > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [authParticles]);

  // Clear fields on toggle
  useEffect(() => {
    setName('');
    setEmail('');
    setPassword('');
    setSecretAdminCode('');
  }, [isLogin, role]);

  // Calculate Form Progress
  const calculateProgress = () => {
    let filled = 1; // Role is always selected
    let total = 1;

    if (isLogin) {
      total += 2; // email, password
      if (email.trim().length > 3) filled++;
      if (password.trim().length > 3) filled++;

      if (role === 'admin') {
        total += 1; // secret admin code
        if (secretAdminCode.trim().length >= 4) filled++;
      }
    } else {
      // Register (Student, Alumni, Admin)
      total += 3; // name, email, password
      if (name.trim().length > 2) filled++;
      if (email.trim().length > 3 && email.includes('@')) filled++;
      if (password.trim().length > 5) filled++;

      if (role === 'admin') {
        total += 1; // secret admin code
        if (secretAdminCode.trim().length >= 4) filled++;
      }
    }

    return filled / total;
  };

  const progress = calculateProgress();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!gmailRegex.test(email)) {
      showNotification('Invalid Email Format', 'Please enter a valid Gmail address ending in @gmail.com.', 'error');
      return;
    }

    try {
      if (isLogin) {
        await login(email, password, role, role === 'admin' ? secretAdminCode : undefined);
      } else {
        await register(name, email, password, role, role === 'admin' ? secretAdminCode : undefined);
      }

      // Successful auth trigger
      setIsLoggedIn(true);

      // Trigger Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#ffffff', '#ffaa00']
      });

      // Let animation play for 1.2s before navigating
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);

    } catch (err: any) {
      console.error('Authentication error:', err);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Absolute top-right role dropdown */}
      <div style={{
        position: 'absolute',
        top: '25px',
        right: '25px',
        zIndex: 1000
      }}>
        <div style={{ position: 'relative' }}>
          <label style={{
            display: 'block',
            fontSize: '11px',
            color: 'var(--color-text-gray)',
            marginBottom: '4px',
            textAlign: 'right',
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            Select Role
          </label>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="glass-panel"
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              textTransform: 'capitalize',
              border: '1px solid var(--color-border-glass-hover)',
              borderRadius: '8px',
              outline: 'none',
              background: 'rgba(20,20,20,0.8)'
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--color-yellow-primary)',
              boxShadow: '0 0 6px var(--color-yellow-primary)'
            }} />
            {role}
            <FiChevronDown style={{
              transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </button>
          
          {isDropdownOpen && (
            <div 
              className="glass-panel"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '140px',
                padding: '6px',
                zIndex: 1010,
                border: '1px solid var(--color-border-glass-hover)',
                background: 'rgba(15,15,15,0.95)'
              }}
            >
              {['student', 'alumni', 'admin'].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r as any);
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderRadius: '6px',
                    color: role === r ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)',
                    fontSize: '13px',
                    fontWeight: role === r ? 600 : 500,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 215, 0, 0.08)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = role === r ? 'var(--color-yellow-primary)' : 'var(--color-text-gray)';
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Authentication Grid */}
      <div 
        className="glass-panel auth-grid-container"
        style={{
          width: '100%',
          maxWidth: '920px',
          height: '620px',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          overflow: 'hidden',
          borderColor: 'rgba(255,215,0,0.15)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Left Column: Tree Animation */}
        <div style={{ width: '100%', height: '100%' }} className="auth-tree-col">
          <TreeAnimation progress={progress} isLoggedIn={isLoggedIn} />
        </div>

        {/* Right Column: Glassmorphic form */}
        <div style={{
          padding: '40px 30px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'rgba(5, 5, 5, 0.5)',
          borderLeft: '1px solid var(--color-border-glass)',
          overflowY: 'auto',
          maxHeight: '100%'
        }} className="auth-form-col">
          
          <div style={{ marginBottom: '28px', textAlign: 'center' }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 800,
              fontFamily: 'var(--font-title)',
              color: '#ffffff',
              letterSpacing: '-0.5px'
            }}>
              {isLogin ? 'Welcome Back' : 'Join Community'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-gray)', marginTop: '4px' }}>
              {isLogin ? 'Sign in to access your Maatram dashboard' : 'Create an account to start networking'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Name field (Register only) */}
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <FiUser style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <FiMail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <FiLock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={isLogin ? 'Enter password' : 'Min 6 characters'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {/* Secret Admin Code field (Admin Login & Register) */}
            {role === 'admin' && (
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--color-yellow-primary)' }}>Secret Admin Code</label>
                <div style={{ position: 'relative' }}>
                  <FiShield style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-yellow-primary)' }} />
                  <input
                    type="password"
                    required
                    placeholder="Enter Secret Code"
                    value={secretAdminCode}
                    onChange={(e) => setSecretAdminCode(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '44px', borderColor: 'rgba(255, 215, 0, 0.4)' }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                justifyContent: 'center',
                marginTop: '10px'
              }}
            >
              {isLogin ? 'Login' : 'Register'}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-gray)' }}>
            <span>
              {isLogin ? "Don't have an account? " : 'Already registered? '}
            </span>
            <button
              onClick={() => setIsLogin(!isLogin)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-yellow-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </div>


        </div>
      </div>

      {/* Global CSS overrides for the Auth Page layout */}
      <style>{`
        .auth-form-col::-webkit-scrollbar {
          width: 5px;
        }
        .auth-form-col::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.15);
        }
        .auth-form-col::-webkit-scrollbar-thumb {
          background: rgba(255, 215, 0, 0.2);
          border-radius: 4px;
        }
        .auth-form-col::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 215, 0, 0.4);
        }

        @media (max-width: 768px) {
          .auth-grid-container {
            grid-template-columns: 1fr !important;
            height: auto !important;
            max-width: 450px !important;
          }
          .auth-tree-col {
            height: 250px !important;
          }
          .auth-form-col {
            border-left: none !important;
            border-top: 1px solid var(--color-border-glass) !important;
            padding: 30px 20px !important;
          }
        }
      `}</style>
    </div>
  );
};
export default AuthPage;
