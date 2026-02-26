import { useState, useEffect } from 'react';
import { profileAPI } from '../services/api';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    headline: '',
    location: '',
    bio: '',
    privacy_show_email: false,
    privacy_show_phone: false,
    privacy_show_location: false,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await profileAPI.getProfile();
      setProfile(response.data);
      if (response.data.profile) {
        setFormData({
          headline: response.data.profile.headline || '',
          location: response.data.profile.location || '',
          bio: response.data.profile.bio || '',
          privacy_show_email: response.data.profile.privacy_show_email || false,
          privacy_show_phone: response.data.profile.privacy_show_phone || false,
          privacy_show_location: response.data.profile.privacy_show_location || false,
        });
      }
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
      setSuccess('Profile updated successfully!');
      setEditing(false);
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="px-6 py-6">
          {!editing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="mt-1 text-base text-gray-900">{profile?.email}</p>
                </div>
                <div className="border border-gray-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                  <p className="mt-1 text-base text-gray-900">{profile?.full_name}</p>
                </div>
              </div>
              <div className="border border-gray-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-500">Headline</h3>
                <p className="mt-1 text-base text-gray-900">{profile?.profile?.headline || 'Not set'}</p>
              </div>
              <div className="border border-gray-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-500">Location</h3>
                <p className="mt-1 text-base text-gray-900">{profile?.profile?.location || 'Not set'}</p>
              </div>
              <div className="border border-gray-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-500">Bio</h3>
                <p className="mt-1 text-base text-gray-700 whitespace-pre-wrap">{profile?.profile?.bio || 'Not set'}</p>
              </div>
              <div className="border-2 border-gray-300 rounded-md p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Privacy Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span className="text-sm text-gray-700">Show Email</span>
                    <span className={profile?.profile?.privacy_show_email ? "text-green-600" : "text-gray-400"}>
                      {profile?.profile?.privacy_show_email ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span className="text-sm text-gray-700">Show Phone</span>
                    <span className={profile?.profile?.privacy_show_phone ? "text-green-600" : "text-gray-400"}>
                      {profile?.profile?.privacy_show_phone ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span className="text-sm text-gray-700">Show Location</span>
                    <span className={profile?.profile?.privacy_show_location ? "text-green-600" : "text-gray-400"}>
                      {profile?.profile?.privacy_show_location ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  name="headline"
                  id="headline"
                  value={formData.headline}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., San Francisco, CA"
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  Professional Bio
                </label>
                <textarea
                  name="bio"
                  id="bio"
                  rows={5}
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us about your experience and skills..."
                />
              </div>

              <div className="pt-3 border-t border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Privacy Controls</h3>
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
                    <label htmlFor="privacy_show_email" className="ml-2 text-sm text-gray-700">
                      Show email address on public profile
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
                    <label htmlFor="privacy_show_phone" className="ml-2 text-sm text-gray-700">
                      Show phone number on public profile
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
                    <label htmlFor="privacy_show_location" className="ml-2 text-sm text-gray-700">
                      Show location on public profile
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
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
