import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardLayout } from './components/DashboardLayout';

const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Connections = lazy(() => import('./pages/Connections').then(module => ({ default: module.Connections })));
const Chat = lazy(() => import('./pages/Chat').then(module => ({ default: module.Chat })));
const Events = lazy(() => import('./pages/Events').then(module => ({ default: module.Events })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const AdminPanel = lazy(() => import('./pages/AdminPanel').then(module => ({ default: module.AdminPanel })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />

        {/* Dashboard Protected Layout & Sub-routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Suspense fallback={<div>Loading Dashboard...</div>}><Dashboard /></Suspense>} />
          <Route path="connections" element={<Suspense fallback={<div>Loading Connections...</div>}><Connections /></Suspense>} />
          <Route path="chat" element={<Suspense fallback={<div>Loading Chat...</div>}><Chat /></Suspense>} />
          <Route path="events" element={<Suspense fallback={<div>Loading Events...</div>}><Events /></Suspense>} />
          <Route path="profile/:id" element={<Suspense fallback={<div>Loading Profile...</div>}><Profile /></Suspense>} />
          <Route path="admin" element={<Suspense fallback={<div>Loading Admin Panel...</div>}><AdminPanel /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<div>Loading Settings...</div>}><Settings /></Suspense>} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
