import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheckCircle, FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationContextProps {
  showNotification: (title: string, message: string, type?: NotificationType) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('info');

  const showNotification = (t: string, m: string, tp: NotificationType = 'info') => {
    setTitle(t);
    setMessage(m);
    setType(tp);
    setActive(true);
  };

  const hideNotification = () => {
    setActive(false);
  };

  // Icon chooser
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheckCircle style={{ color: '#ffd700', fontSize: '42px', marginBottom: '16px' }} />;
      case 'error':
        return <FiAlertTriangle style={{ color: '#ff4444', fontSize: '42px', marginBottom: '16px' }} />;
      case 'warning':
        return <FiAlertTriangle style={{ color: '#ffaa00', fontSize: '42px', marginBottom: '16px' }} />;
      case 'info':
      default:
        return <FiInfo style={{ color: '#ffd700', fontSize: '42px', marginBottom: '16px' }} />;
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <AnimatePresence>
        {active && (
          <div className="notification-overlay" onClick={hideNotification}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="glass-panel notification-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-10px -10px 0 0' }}>
                <button
                  onClick={hideNotification}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666666',
                    cursor: 'pointer',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    borderRadius: '50%',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffd700';
                    e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#666666';
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  <FiX />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {getIcon()}
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-title)',
                  marginBottom: '10px',
                  color: '#ffffff',
                  letterSpacing: '0.5px'
                }}>
                  {title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#a0a0a0',
                  lineHeight: '1.6',
                  fontFamily: 'var(--font-body)'
                }}>
                  {message}
                </p>
                <button
                  className="btn-primary"
                  onClick={hideNotification}
                  style={{
                    marginTop: '24px',
                    padding: '8px 24px',
                    fontSize: '14px',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};
