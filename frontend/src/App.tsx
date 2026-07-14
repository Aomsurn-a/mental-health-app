import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assessment from './pages/Assessment';
import MoodTracking from './pages/MoodTracking';
import AppointmentPage from './pages/AppointmentPage';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const auth = useContext(AuthContext);
  if (auth?.loading) return <div style={{ padding: 24 }}>กำลังโหลด...</div>;
  return auth?.isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <PrivateRoute>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </PrivateRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/assessment" element={
        <PrivateRoute>
          <MainLayout><Assessment /></MainLayout>
        </PrivateRoute>
      } />
      <Route path="/mood" element={
        <PrivateRoute>
          <MainLayout><MoodTracking /></MainLayout>
        </PrivateRoute>
      } />
      <Route path="/appointment" element={
        <PrivateRoute>
          <MainLayout><AppointmentPage /></MainLayout>
        </PrivateRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <ConfigProvider>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ConfigProvider>
  );
}

export default App;