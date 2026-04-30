import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from './components/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './pages/Layout';
import { Login } from './pages/Login';
import { AcceptInvite } from './pages/AcceptInvite';
import { Setup2FA } from './pages/Setup2FA';
import { AdminPanel } from './pages/AdminPanel';
import Dashboard from './pages/Dashboard';
import TrialList from './pages/TrialList';
import TrialDetail from './pages/TrialDetail';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import Landing from './pages/Landing';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/setup-2fa" element={<Setup2FA />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/trials" element={<TrialList />} />
              <Route path="/trials/:id" element={<TrialDetail />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <ToastContainer />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;

