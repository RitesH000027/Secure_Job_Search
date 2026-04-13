import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Wrong credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center px-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        <div>
          <img src="/CB.png" alt="CareerBridge" className="w-14 h-14 rounded-lg object-contain p-1 border border-gray-200 bg-white" />
          <h1 className="mt-6 text-4xl font-light text-[#0a66c2] leading-tight">Welcome back to your professional network</h1>
          <p className="mt-4 text-gray-600">Sign in to manage your profile, applications, and recruiter conversations.</p>
        </div>

        <div className="li-card p-8 shadow-sm">
          <h2 className="text-3xl font-semibold text-gray-900">Sign in</h2>
          <p className="text-sm text-gray-500 mt-1">Stay updated on your professional world</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

            <input
              type="email"
              className="li-input"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              type="password"
              className="li-input"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button type="submit" className="li-btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <Link className="block text-center text-sm text-[#0a66c2] font-semibold hover:underline" to="/forgot-password">
              Forgot password?
            </Link>
          </form>

          <p className="mt-5 text-sm text-gray-600">
            New to CareerBridge?{' '}
            <Link className="text-[#0a66c2] font-semibold hover:underline" to="/register">
              Join now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
