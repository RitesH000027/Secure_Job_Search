import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="li-card p-4 sm:p-6">
        <p className="text-sm text-gray-500">Welcome back</p>
        <h1 className="li-title mt-1">{user?.full_name}</h1>
        <p className="li-subtitle mt-2 sm:mt-3">Keep building your professional profile and opportunities.</p>
      </div>

      <div className="li-card p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0a66c2] text-white flex items-center justify-center font-semibold shadow-sm">
            {(user?.full_name || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="li-input bg-gray-50 text-gray-500">Start a post about your skills, goals, or work update...</div>
        </div>
      </div>

      <div className="li-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Link
            to="/profile"
            className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Edit Profile</h3>
            <p className="text-sm text-gray-600 mt-1">Keep your headline, location, and bio updated.</p>
          </Link>

          <Link
            to="/resume"
            className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Manage Resume</h3>
            <p className="text-sm text-gray-600 mt-1">Upload encrypted CVs and control visibility.</p>
          </Link>

          <Link
            to="/jobs"
            className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Jobs & Applications</h3>
            <p className="text-sm text-gray-600 mt-1">Discover roles and track application pipeline.</p>
          </Link>

          <Link
            to="/messages"
            className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Secure Messaging</h3>
            <p className="text-sm text-gray-600 mt-1">Continue candidate-recruiter conversations.</p>
          </Link>
        </div>
      </div>

      <div className="li-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Profile completion snapshot</h2>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-600">Verification status</span>
          <span className="font-semibold text-green-700">{user?.is_verified ? 'Verified' : 'Pending'}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-600">Role</span>
          <span className="font-semibold capitalize">{user?.role}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
