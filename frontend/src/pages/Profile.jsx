import { useEffect, useState } from 'react';
import { profileAPI } from '../services/api';

const initialFormState = {
  headline: '',
  location: '',
  bio: '',
  privacy_show_email: false,
  privacy_show_phone: false,
  privacy_show_location: false,
  allow_profile_view_tracking: true,
};

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      const user = response.data;
      const profile = user.profile || {};

      setProfileData(user);
      setFormData({
        headline: profile.headline || '',
        location: profile.location || '',
        bio: profile.bio || '',
        privacy_show_email: profile.privacy_show_email || false,
        privacy_show_phone: profile.privacy_show_phone || false,
        privacy_show_location: profile.privacy_show_location || false,
        allow_profile_view_tracking: profile.allow_profile_view_tracking ?? true,
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      await profileAPI.updateProfile(formData);
      setSuccess('Profile updated successfully');
      setEditing(false);
      await fetchProfile();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  if (loading) {
    return <div className="li-card p-6 text-sm text-gray-600">Loading profile...</div>;
  }

  const profile = profileData?.profile || {};

  return (
    <div className="space-y-5">
      <div className="li-card p-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="li-title">Profile</h1>
          <p className="li-subtitle mt-2">Manage your public professional identity.</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="li-btn-primary">
            Edit Profile
          </button>
        )}
      </div>

      {error && <div className="li-card border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="li-card border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {!editing ? (
        <div className="li-card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Full Name</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{profileData?.full_name || '-'}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Email</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{profileData?.email || '-'}</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Headline</p>
            <p className="mt-1 text-sm text-gray-800">{profile.headline || 'Not set'}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Location</p>
            <p className="mt-1 text-sm text-gray-800">{profile.location || 'Not set'}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Bio</p>
            <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{profile.bio || 'Not set'}</p>
          </div>

          <div className="border-t border-gray-200 pt-5">
            <p className="text-sm font-semibold text-gray-900 mb-3">Privacy Settings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
              <p className="rounded-lg border border-gray-200 px-3 py-2">Email visible: {profile.privacy_show_email ? 'Yes' : 'No'}</p>
              <p className="rounded-lg border border-gray-200 px-3 py-2">Phone visible: {profile.privacy_show_phone ? 'Yes' : 'No'}</p>
              <p className="rounded-lg border border-gray-200 px-3 py-2">Location visible: {profile.privacy_show_location ? 'Yes' : 'No'}</p>
              <p className="rounded-lg border border-gray-200 px-3 py-2">Track profile views: {profile.allow_profile_view_tracking ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="li-card p-6 space-y-5">
          <div>
            <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-1">
              Headline
            </label>
            <input
              id="headline"
              name="headline"
              className="li-input"
              value={formData.headline}
              onChange={handleChange}
              placeholder="e.g., Security Engineer"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              id="location"
              name="location"
              className="li-input"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Bengaluru"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              className="li-input"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Short summary about your skills and interests"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <input type="checkbox" name="privacy_show_email" checked={formData.privacy_show_email} onChange={handleChange} />
              Show email on public profile
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <input type="checkbox" name="privacy_show_phone" checked={formData.privacy_show_phone} onChange={handleChange} />
              Show phone on public profile
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <input type="checkbox" name="privacy_show_location" checked={formData.privacy_show_location} onChange={handleChange} />
              Show location on public profile
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <input type="checkbox" name="allow_profile_view_tracking" checked={formData.allow_profile_view_tracking} onChange={handleChange} />
              Enable profile view tracking
            </label>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="li-btn-primary">
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError('');
                setSuccess('');
                setFormData({
                  headline: profile.headline || '',
                  location: profile.location || '',
                  bio: profile.bio || '',
                  privacy_show_email: profile.privacy_show_email || false,
                  privacy_show_phone: profile.privacy_show_phone || false,
                  privacy_show_location: profile.privacy_show_location || false,
                  allow_profile_view_tracking: profile.allow_profile_view_tracking ?? true,
                });
              }}
              className="li-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Profile;
