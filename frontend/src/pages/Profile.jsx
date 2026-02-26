import { useState, useEffect } from 'react';
import { profileAPI } from '../services/api';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    headline: '',
    bio: '',
    location: '',
    privacy_show_email: true,
    privacy_show_phone: true,
    privacy_show_location: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await profileAPI.getMyProfile();
      setProfile(response.data);
      setFormData({
        headline: response.data.profile?.headline || '',
        bio: response.data.profile?.bio || '',
        location: response.data.profile?.location || '',
        privacy_show_email: response.data.profile?.privacy_show_email ?? true,
        privacy_show_phone: response.data.profile?.privacy_show_phone ?? true,
        privacy_show_location: response.data.profile?.privacy_show_location ?? true,
      });
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await profileAPI.updateProfile(formData);
      setSuccess('Profile updated successfully');
      setEditing(false);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-4 bg-green-50 rounded-md">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <div className="px-6 py-4">
          {!editing ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="mt-1 text-lg text-gray-900">{profile?.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                <p className="mt-1 text-lg text-gray-900">{profile?.full_name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Headline</h3>
                <p className="mt-1 text-lg text-gray-900">{profile?.profile?.headline || 'Not set'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Location</h3>
                <p className="mt-1 text-lg text-gray-900">{profile?.profile?.location || 'Not set'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Bio</h3>
                <p className="mt-1 text-lg text-gray-900">{profile?.profile?.bio || 'Not set'}</p>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Privacy Settings</h3>
                <div className="space-y-2">
                  <p className="text-sm">Show Email: {profile?.profile?.privacy_show_email ? '✓ Yes' : '✗ No'}</p>
                  <p className="text-sm">Show Phone: {profile?.profile?.privacy_show_phone ? '✓ Yes' : '✗ No'}</p>
                  <p className="text-sm">Show Location: {profile?.profile?.privacy_show_location ? '✓ Yes' : '✗ No'}</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="headline" className="block text-sm font-medium text-gray-700">
                  Headline
                </label>
                <input
                  type="text"
                  name="headline"
                  id="headline"
                  value={formData.headline}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Software Engineer"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., San Francisco, CA"
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  name="bio"
                  id="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Privacy Settings</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="privacy_show_email"
                      id="privacy_show_email"
                      checked={formData.privacy_show_email}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="privacy_show_email" className="ml-2 block text-sm text-gray-900">
                      Show email on profile
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="privacy_show_phone"
                      id="privacy_show_phone"
                      checked={formData.privacy_show_phone}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="privacy_show_phone" className="ml-2 block text-sm text-gray-900">
                      Show phone on profile
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="privacy_show_location"
                      id="privacy_show_location"
                      checked={formData.privacy_show_location}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="privacy_show_location" className="ml-2 block text-sm text-gray-900">
                      Show location on profile
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
