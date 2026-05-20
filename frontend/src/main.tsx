import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { SocketProvider } from './context/SocketContext.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NotificationProvider>
      <AuthProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AuthProvider>
    </NotificationProvider>
  </React.StrictMode>,
);
