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
import ComplaintPage from './pages/Complaint';
import PsyAppointment from './pages/PsyAppointment';
import PsyPatients from './pages/PsyPatients';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminComplaints from './pages/AdminComplaints';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import AssessmentHistory from './pages/AssessmentHistory';
import PsychologistList from './pages/PsychologistList';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const auth = useContext(AuthContext);
  if (auth?.loading) return <div style={{ padding: 24 }}>กำลังโหลด...</div>;
  return auth?.isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppointmentRoute = () => {
  const auth = useContext(AuthContext);
  if (auth?.user?.role === 'psychologist') return <PsyAppointment />;
  return <AppointmentPage />;
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
          <MainLayout><AppointmentRoute /></MainLayout>
        </PrivateRoute>
      } />
      <Route path="/complaint" element={
        <PrivateRoute>
          <MainLayout><ComplaintPage /></MainLayout>
        </PrivateRoute>
      } />
      <Route path="/psy-appointment" element={
        <PrivateRoute>
          <MainLayout><PsyAppointment /></MainLayout>
        </PrivateRoute>
      } />
      <Route path="patients" element={
        <PrivateRoute>
          <MainLayout><PsyPatients /></MainLayout>
        </PrivateRoute>
      } />
      <Route path="/users" element={
        <PrivateRoute>
          <MainLayout><AdminUsers /></MainLayout>
        </PrivateRoute>
      } />
      <Route path="/complaint-admin" element={
        <PrivateRoute>
          <MainLayout><AdminComplaints /></MainLayout>
        </PrivateRoute>
      } />
      <Route path="/chat" element = {
        <PrivateRoute>
          <MainLayout><Chat /></MainLayout>
        </PrivateRoute>
      } />
      <Route path="/profile" element = {
        <PrivateRoute>
          <MainLayout><Profile /></MainLayout>
        </PrivateRoute>
      } />
      <Route path="/assessment-history" element={
        <PrivateRoute>
          <MainLayout><AssessmentHistory /></MainLayout>
        </PrivateRoute>
      } /> 
      <Route path="/psychologists" element={
        <PrivateRoute>
          <MainLayout><PsychologistList /></MainLayout>
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