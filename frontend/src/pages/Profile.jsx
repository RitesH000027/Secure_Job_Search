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
      <div className="flex justify-center items-center h-96">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-t-4 border-purple-600"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 px-8 py-6 flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mr-4 shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">My Profile</h2>
              <p className="text-purple-100 text-sm">Manage your professional information</p>
            </div>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center px-6 py-3 bg-white/20 backdrop-blur-lg text-white rounded-xl hover:bg-white/30 font-semibold transform transition-all duration-200 hover:scale-105 shadow-lg"
          >
            {editing ? (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-shake">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mx-8 mt-6 p-4 bg-green-50 border border-green-200 rounded-xl animate-pulse">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        )}

        <div className="px-8 py-6">
          {!editing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-600 mb-1 flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">{profile?.email}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                  <h3 className="text-sm font-semibold text-purple-600 mb-1 flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Full Name
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">{profile?.full_name}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <h3 className="text-sm font-semibold text-green-600 mb-1 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Headline
                </h3>
                <p className="text-lg font-semibold text-gray-900">{profile?.profile?.headline || 'Not set'}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-200">
                <h3 className="text-sm font-semibold text-orange-600 mb-1 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Location
                </h3>
                <p className="text-lg font-semibold text-gray-900">{profile?.profile?.location || 'Not set'}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-xl border border-cyan-200">
                <h3 className="text-sm font-semibold text-cyan-600 mb-1 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Bio
                </h3>
                <p className="text-base text-gray-700 whitespace-pre-wrap">{profile?.profile?.bio || 'Not set'}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
                <h3 className="text-base font-bold text-indigo-700 mb-4 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Privacy Settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Show Email</span>
                    {profile?.profile?.privacy_show_email ? (
                      <span className="flex items-center text-green-600 font-semibold">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600 font-semibold">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Show Phone</span>
                    {profile?.profile?.privacy_show_phone ? (
                      <span className="flex items-center text-green-600 font-semibold">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600 font-semibold">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Show Location</span>
                    {profile?.profile?.privacy_show_location ? (
                      <span className="flex items-center text-green-600 font-semibold">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600 font-semibold">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="headline" className="block text-sm font-semibold text-gray-700 mb-2">
                  Professional Headline
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="headline"
                    id="headline"
                    value={formData.headline}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-purple-300"
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="location"
                    id="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-purple-300"
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-semibold text-gray-700 mb-2">
                  Professional Bio
                </label>
                <textarea
                  name="bio"
                  id="bio"
                  rows={6}
                  value={formData.bio}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-purple-300 resize-none"
                  placeholder="Tell us about your experience, skills, and what you're looking for..."
                />
              </div>

              <div className="pt-4 border-t-2 border-gray-200">
                <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center">
                  <svg className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Privacy Controls
                </h3>
                <div className="space-y-3 bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between bg-white p-4 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="privacy_show_email"
                        id="privacy_show_email"
                        checked={formData.privacy_show_email}
                        onChange={handleChange}
                        className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                      />
                      <label htmlFor="privacy_show_email" className="ml-3 block text-sm font-medium text-gray-900 cursor-pointer">
                        Show email address on public profile
                      </label>
                    </div>
                    {formData.privacy_show_email && (
                      <span className="text-green-600">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-white p-4 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="privacy_show_phone"
                        id="privacy_show_phone"
                        checked={formData.privacy_show_phone}
                        onChange={handleChange}
                        className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                      />
                      <label htmlFor="privacy_show_phone" className="ml-3 block text-sm font-medium text-gray-900 cursor-pointer">
                        Show phone number on public profile
                      </label>
                    </div>
                    {formData.privacy_show_phone && (
                      <span className="text-green-600">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-white p-4 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="privacy_show_location"
                        id="privacy_show_location"
                        checked={formData.privacy_show_location}
                        onChange={handleChange}
                        className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                      />
                      <label htmlFor="privacy_show_location" className="ml-3 block text-sm font-medium text-gray-900 cursor-pointer">
                        Show location on public profile
                      </label>
                    </div>
                    {formData.privacy_show_location && (
                      <span className="text-green-600">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
