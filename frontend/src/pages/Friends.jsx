import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectionAPI } from '../services/api';

const Friends = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await connectionAPI.listFriends();
        setFriends(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(err?.response?.data?.detail || 'Failed to load friends.');
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, []);

  return (
    <div className="space-y-5">
      <div className="li-card p-6">
        <h1 className="li-title">All Friends</h1>
        <p className="li-subtitle mt-2">Your full connection list.</p>
      </div>

      {error && <div className="li-card border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="li-card p-5">
        {loading ? (
          <p className="text-sm text-gray-600">Loading friends...</p>
        ) : friends.length === 0 ? (
          <p className="text-sm text-gray-600">No connections yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {friends.map((friend) => (
              <div key={friend.id} className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{friend.full_name}</p>
                  <p className="text-xs text-gray-500">{friend.headline || friend.role}</p>
                </div>
                <button
                  type="button"
                  className="li-btn-secondary !py-1.5 !px-3"
                  onClick={() => navigate(`/messages?user=${friend.id}`)}
                >
                  Message
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
