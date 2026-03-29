import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, usersRes, auditRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        adminAPI.getAuditLogs(20),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || usersRes.data);
      setAuditLogs(auditRes.data || []);
    } catch (err) {
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (userId) => {
    const reason = prompt('Enter suspension reason:');
    if (!reason || reason.length < 10) {
      alert('Reason must be at least 10 characters');
      return;
    }

    try {
      await adminAPI.suspendUser(userId, { reason });
      setSuccess('User suspended successfully');
      loadData();
    } catch (err) {
      setError('Failed to suspend user');
    }
  };

  const handleActivate = async (userId) => {
    try {
      await adminAPI.activateUser(userId);
      setSuccess('User activated successfully');
      loadData();
    } catch (err) {
      setError('Failed to activate user');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await adminAPI.deleteUser(userId);
      setSuccess('User deleted successfully');
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="li-card p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0a66c2]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="li-card p-6">
        <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Monitor platform health, moderate users, and inspect audit trails.</p>
      </div>

      {error && <div className="li-card border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="li-card border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="li-card p-4">
          <p className="text-xs text-gray-500">Total Users</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats?.total_users || 0}</p>
        </div>
        <div className="li-card p-4">
          <p className="text-xs text-gray-500">Verified Users</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats?.verified_users || 0}</p>
        </div>
        <div className="li-card p-4">
          <p className="text-xs text-gray-500">Total Resumes</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats?.total_resumes || 0}</p>
        </div>
        <div className="li-card p-4">
          <p className="text-xs text-gray-500">TOTP Enabled</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats?.security_stats?.totp_enabled || 0}</p>
        </div>
      </div>

      <div className="li-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">User Management</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Verified</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-5 py-4 capitalize text-gray-700">{user.role}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      user.is_suspended ? 'bg-red-100 text-red-700' : user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.is_suspended ? 'Suspended' : user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-700">{user.is_verified ? 'Yes' : 'No'}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {user.is_suspended ? (
                        <button onClick={() => handleActivate(user.id)} className="li-btn-secondary">Activate</button>
                      ) : (
                        <button onClick={() => handleSuspend(user.id)} className="li-btn-secondary">Suspend</button>
                      )}
                      <button onClick={() => handleDelete(user.id)} className="px-4 py-2 rounded-full text-sm font-semibold border border-red-300 text-red-700 hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="li-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Recent Audit Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Time</th>
                <th className="px-5 py-3 text-left">Action</th>
                <th className="px-5 py-3 text-left">Target</th>
                <th className="px-5 py-3 text-left">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td className="px-5 py-4 text-gray-600" colSpan={4}>No audit logs yet.</td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{log.action}</td>
                    <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{log.target_type} #{log.target_id || '-'}</td>
                    <td className="px-5 py-4 text-xs text-gray-500 font-mono">{log.entry_hash?.slice(0, 16)}...</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
