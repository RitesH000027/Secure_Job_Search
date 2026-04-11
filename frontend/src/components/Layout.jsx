import { useEffect, useState } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { connectionAPI } from '../services/api';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [connectionsCount, setConnectionsCount] = useState(0);

  useEffect(() => {
    const loadConnectionsCount = async () => {
      try {
        const response = await connectionAPI.listFriends();
        const friends = Array.isArray(response.data) ? response.data : [];
        setConnectionsCount(friends.length);
      } catch {
        setConnectionsCount(0);
      }
    };

    if (user) {
      loadConnectionsCount();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Home' },
    { to: '/companies', label: 'Companies' },
    { to: '/jobs', label: 'Jobs' },
    { to: '/messages', label: 'Messaging' },
    { to: '/profile', label: 'Profile' },
    { to: '/resume', label: 'Resume' },
  ];

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1120px] mx-auto px-3 sm:px-4 py-2 sm:py-0 sm:h-16">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/CB.png" alt="CareerBridge" className="w-8 h-8 sm:w-9 sm:h-9 rounded-md object-cover border border-gray-200 bg-white" />
              <div className="hidden md:block">
                <input className="li-input w-72 bg-[#edf3f8] border-0" placeholder="Search people, jobs, posts" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-gray-900 leading-none">{user?.full_name}</p>
                <p className="text-xs text-gray-500 mt-1 capitalize">{user?.role}</p>
              </div>
              <button onClick={handleLogout} className="li-btn-secondary !px-3 !py-1.5">Logout</button>
            </div>
          </div>

          <nav className="mt-2 sm:mt-0 flex items-center gap-1 md:gap-2 overflow-x-auto li-hide-scrollbar pb-1 sm:pb-0">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive ? 'text-[#0a66c2] bg-blue-50' : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive ? 'text-[#0a66c2] bg-blue-50' : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                Admin
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-[1120px] mx-auto px-2 sm:px-4 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          <div className="li-card p-4 overflow-hidden">
            <div className="h-16 rounded-lg bg-gradient-to-r from-blue-200 to-blue-400" />
            <div className="-mt-6 w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-[#0a66c2] shadow-sm">
              {(user?.full_name || 'U').slice(0, 1).toUpperCase()}
            </div>
            <h2 className="mt-2 text-base font-semibold text-gray-900">{user?.full_name}</h2>
            <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
            <div className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600 space-y-1">
              <p>Connections: {connectionsCount}</p>
            </div>
          </div>

          <div className="li-card p-4 text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-gray-900">Quick Links</p>
            <Link to="/profile" className="block hover:text-[#0a66c2]">Edit Profile</Link>
            <Link to="/jobs" className="block hover:text-[#0a66c2]">Find Jobs</Link>
            <Link to="/messages" className="block hover:text-[#0a66c2]">Open Messaging</Link>
          </div>
        </aside>

        <section className="lg:col-span-9 space-y-4 min-w-0">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default Layout;
