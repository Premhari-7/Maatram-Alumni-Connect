import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardLayout } from './components/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Feed } from './pages/Feed';
import { Connections } from './pages/Connections';
import { Chat } from './pages/Chat';
import { Events } from './pages/Events';
import { Profile } from './pages/Profile';
import { AdminPanel } from './pages/AdminPanel';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />

        {/* Dashboard Protected Layout & Sub-routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="feed" element={<Feed />} />
          <Route path="connections" element={<Connections />} />
          <Route path="chat" element={<Chat />} />
          <Route path="events" element={<Events />} />
          <Route path="profile/:id" element={<Profile />} />
          <Route path="admin" element={<AdminPanel />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
