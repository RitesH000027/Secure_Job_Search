import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ResumeUpload from './pages/ResumeUpload';
import AdminDashboard from './pages/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={<Layout />}>
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          <Route path="/resume" element={
            <PrivateRoute>
              <ResumeUpload />
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute requireAdmin>
              <AdminDashboard />
            </PrivateRoute>
          } />
        </Route>
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
