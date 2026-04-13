import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { connectionAPI, searchAPI } from '../services/api';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [connections, setConnections] = useState([]);
  const [showConnections, setShowConnections] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef(null);
  const CONNECTIONS_REFRESH_INTERVAL_MS = 3500;

  useEffect(() => {
    const loadConnectionsCount = async () => {
      try {
        const response = await connectionAPI.listFriends();
        const friends = Array.isArray(response.data) ? response.data : [];
        setConnections(friends);
        setConnectionsCount(friends.length);
      } catch {
        setConnections([]);
        setConnectionsCount(0);
      }
    };

    if (user) {
      loadConnectionsCount();
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const pollConnections = async () => {
      if (cancelled || inFlight) {
        return;
      }

      inFlight = true;
      try {
        const response = await connectionAPI.listFriends();
        if (cancelled) {
          return;
        }

        const friends = Array.isArray(response.data) ? response.data : [];
        setConnections(friends);
        setConnectionsCount(friends.length);
      } catch {
        // Keep the last known connection list during background refresh.
      } finally {
        inFlight = false;
      }
    };

    const intervalId = setInterval(pollConnections, CONNECTIONS_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    const query = searchText.trim();
    if (!query) {
      setSearchSuggestions([]);
      setSearchOpen(false);
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await searchAPI.global(query, 6);
        setSearchSuggestions(response.data || []);
        setSearchOpen(true);
      } catch {
        setSearchSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchText.trim();
    if (!query) {
      return;
    }

    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchText('');
    setSearchSuggestions([]);
    setSearchOpen(false);
    if (suggestion.result_type === 'person' && suggestion.connection_status !== 'connected') {
      navigate(`/messages?q=${encodeURIComponent(suggestion.title)}`);
      return;
    }

    navigate(suggestion.url);
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
              <div className="h-8 sm:h-9 w-12 sm:w-14 rounded-md border border-gray-200 bg-white overflow-hidden shrink-0">
                <img src="/CB.png" alt="CareerBridge" className="w-full h-full object-contain block" />
              </div>
              <div className="hidden md:block relative" ref={searchBoxRef}>
                <form onSubmit={handleSearchSubmit}>
                  <input
                    className="li-input w-72 bg-[#edf3f8] border-0"
                    placeholder="Search people or companies"
                    value={searchText}
                    onChange={(event) => {
                      setSearchText(event.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => {
                      if (searchText.trim()) {
                        setSearchOpen(true);
                      }
                    }}
                  />
                </form>
                {searchOpen && searchText.trim() && (
                  <div className="absolute left-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-30">
                    {searchLoading ? (
                      <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                    ) : searchSuggestions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">No suggestions found</div>
                    ) : (
                      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                        {searchSuggestions.map((item) => (
                          <button
                            key={`${item.result_type}-${item.id}`}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-gray-50"
                            onClick={() => handleSuggestionClick(item)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{item.subtitle}</p>
                              </div>
                              <span className="text-[10px] uppercase tracking-wide text-gray-400">
                                {item.result_type === 'person' && item.connection_status !== 'connected' ? 'add friend' : item.result_type}
                              </span>
                            </div>
                            {item.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="w-full text-left px-4 py-3 text-sm font-medium text-[#0a66c2] hover:bg-blue-50"
                          onClick={handleSearchSubmit}
                        >
                          View full search results
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
              <button
                type="button"
                className="text-left text-[#0a66c2] hover:underline"
                onClick={() => setShowConnections((previous) => !previous)}
              >
                Connections: {connectionsCount}
              </button>
              {showConnections && (
                <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                  {connections.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-500">No connections yet.</p>
                  ) : (
                    connections.map((friend) => (
                      <button
                        key={friend.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        onClick={() => navigate(`/messages?user=${friend.id}`)}
                      >
                        <p className="text-sm font-medium text-gray-900">{friend.full_name}</p>
                        <p className="text-xs text-gray-500">{friend.headline || friend.role}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
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
