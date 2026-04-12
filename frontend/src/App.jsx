import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ResumeUpload from './pages/ResumeUpload';
import AdminDashboard from './pages/AdminDashboard';
import Jobs from './pages/Jobs';
import Messages from './pages/Messages';
import Companies from './pages/Companies';
import CompanyJobs from './pages/CompanyJobs';
import SearchResults from './pages/SearchResults';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
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
          <Route path="/jobs" element={
            <PrivateRoute>
              <Jobs />
            </PrivateRoute>
          } />
          <Route path="/companies" element={
            <PrivateRoute>
              <Companies />
            </PrivateRoute>
          } />
          <Route path="/companies/:id/jobs" element={
            <PrivateRoute>
              <CompanyJobs />
            </PrivateRoute>
          } />
          <Route path="/search" element={
            <PrivateRoute>
              <SearchResults />
            </PrivateRoute>
          } />
          <Route path="/messages" element={
            <PrivateRoute>
              <Messages />
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
