import { useEffect, useState } from 'react';
import { API_BASE_URL, authAPI, profileAPI } from '../services/api';

const initialFormState = {
  headline: '',
  location: '',
  bio: '',
  education: '',
  experience: '',
  skills: '',
  profile_picture_url: '',
  privacy_headline: 'public',
  privacy_location: 'public',
  privacy_bio: 'public',
  privacy_education: 'public',
  privacy_experience: 'public',
  privacy_skills: 'public',
  privacy_show_email: false,
  privacy_show_phone: false,
  privacy_show_location: false,
  allow_profile_view_tracking: true,
};

const OTPKeyboard = ({ value, onDigit, onBackspace, onClear }) => {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="space-y-3">
      <input className="li-input text-center tracking-[0.35em]" value={value} readOnly placeholder="••••••" />
      <div className="grid grid-cols-3 gap-2">
        {digits.map((digit) => (
          <button key={digit} type="button" onClick={() => onDigit(digit)} className="li-btn-secondary !rounded-lg !py-2">
            {digit}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onBackspace} className="li-btn-secondary !rounded-lg !py-2">Backspace</button>
        <button type="button" onClick={onClear} className="li-btn-secondary !rounded-lg !py-2">Clear</button>
      </div>
    </div>
  );
};

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [recentViewers, setRecentViewers] = useState([]);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadProfilePage();
  }, []);

  const loadProfilePage = async () => {
    const ok = await fetchProfile();
    if (ok) {
      await fetchRecentViewers();
    }
  };

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
        education: profile.education || '',
        experience: profile.experience || '',
        skills: profile.skills || '',
        profile_picture_url: profile.profile_picture_url || '',
        privacy_headline: profile.privacy_headline || 'public',
        privacy_location: profile.privacy_location || 'public',
        privacy_bio: profile.privacy_bio || 'public',
        privacy_education: profile.privacy_education || 'public',
        privacy_experience: profile.privacy_experience || 'public',
        privacy_skills: profile.privacy_skills || 'public',
        privacy_show_email: profile.privacy_show_email || false,
        privacy_show_phone: profile.privacy_show_phone || false,
        privacy_show_location: profile.privacy_show_location || false,
        allow_profile_view_tracking: profile.allow_profile_view_tracking ?? true,
      });
      setProfilePicturePreview(profile.profile_picture_url || '');
      setProfilePictureFile(null);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load profile');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentViewers = async () => {
    try {
      const response = await profileAPI.getRecentViewers(10);
      setRecentViewers(response.data || []);
    } catch {
      setRecentViewers([]);
    }
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleProfilePictureSelect = (event) => {
    const file = event.target.files?.[0] || null;
    setProfilePictureFile(file);
    if (file) {
      setProfilePicturePreview(URL.createObjectURL(file));
    } else {
      setProfilePicturePreview(profileData?.profile?.profile_picture_url || '');
    }
  };

  const uploadProfilePicture = async () => {
    if (!profilePictureFile) {
      setError('Choose an image file first');
      return;
    }

    try {
      setUploadingPicture(true);
      setError('');
      setSuccess('');
      await profileAPI.uploadProfilePicture(profilePictureFile);
      setSuccess('Profile picture uploaded successfully');
      setProfilePictureFile(null);
      await fetchProfile();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
    }
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
      await fetchRecentViewers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  const appendDeleteOtpDigit = (digit) => {
    setDeleteOtp((previous) => (previous.length >= 6 ? previous : `${previous}${digit}`));
  };

  const backspaceDeleteOtp = () => {
    setDeleteOtp((previous) => previous.slice(0, -1));
  };

  const clearDeleteOtp = () => {
    setDeleteOtp('');
  };

  const requestDeleteOtp = async () => {
    try {
      setDeleteLoading(true);
      setError('');
      setSuccess('');
      await authAPI.requestHighRiskOTP('account_delete');
      setSuccess('OTP sent. Enter it using the virtual keyboard to deactivate account.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request account delete OTP');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (deleteOtp.length !== 6) {
      setError('Enter valid 6-digit OTP');
      return;
    }

    try {
      setDeleteLoading(true);
      await profileAPI.deleteMyProfile(deleteOtp);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to deactivate account');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <div className="li-card p-6 text-sm text-gray-600">Loading profile...</div>;
  }

  const profile = profileData?.profile || {};
  const profilePictureSrc = profilePicturePreview
    ? (profilePicturePreview.startsWith('blob:') || profilePicturePreview.startsWith('http')
      ? profilePicturePreview
      : `${API_BASE_URL}${profilePicturePreview}`)
    : '';

  return (
    <div className="space-y-5">
      <div className="li-card p-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="li-title">Profile</h1>
          <p className="li-subtitle mt-2">Manage your professional identity and privacy settings.</p>
        </div>
        {!editing && <button onClick={() => setEditing(true)} className="li-btn-primary">Edit Profile</button>}
      </div>

      {error && <div className="li-card border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="li-card border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <div className="li-card p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Profile completion snapshot</h2>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-600">Verification status</span>
          <span className={`font-semibold ${profileData?.is_verified ? 'text-green-700' : 'text-amber-700'}`}>
            {profileData?.is_verified ? 'Verified' : 'Pending'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-600">Role</span>
          <span className="font-semibold capitalize">{profileData?.role || '-'}</span>
        </div>
      </div>

      {!editing ? (
        <div className="li-card p-6 space-y-6">
          {profile.profile_picture_url && (
            <div className="flex items-center gap-4">
              <img
                src={profile.profile_picture_url.startsWith('http') ? profile.profile_picture_url : `${API_BASE_URL}${profile.profile_picture_url}`}
                alt="Profile"
                className="h-20 w-20 rounded-full object-cover border border-gray-200"
              />
              <div>
                <p className="text-xs text-gray-500">Profile Picture</p>
                <p className="text-sm text-gray-700">Uploaded image</p>
              </div>
            </div>
          )}

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

          <div className="rounded-lg border border-gray-200 p-4"><p className="text-xs text-gray-500">Headline</p><p className="mt-1 text-sm text-gray-800">{profile.headline || 'Not set'}</p></div>
          <div className="rounded-lg border border-gray-200 p-4"><p className="text-xs text-gray-500">Location</p><p className="mt-1 text-sm text-gray-800">{profile.location || 'Not set'}</p></div>
          <div className="rounded-lg border border-gray-200 p-4"><p className="text-xs text-gray-500">Education</p><p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{profile.education || 'Not set'}</p></div>
          <div className="rounded-lg border border-gray-200 p-4"><p className="text-xs text-gray-500">Experience</p><p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{profile.experience || 'Not set'}</p></div>
          <div className="rounded-lg border border-gray-200 p-4"><p className="text-xs text-gray-500">Skills</p><p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{profile.skills || 'Not set'}</p></div>
          <div className="rounded-lg border border-gray-200 p-4"><p className="text-xs text-gray-500">Bio</p><p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{profile.bio || 'Not set'}</p></div>

          <div className="border-t border-gray-200 pt-5 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Recent Viewers</p>
            {recentViewers.length === 0 ? (
              <p className="text-sm text-gray-600">No recent viewers or tracking disabled.</p>
            ) : (
              <ul className="space-y-2">
                {recentViewers.map((viewer, index) => (
                  <li key={`${viewer.viewer_id}-${index}`} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                    {viewer.viewer_name} • {new Date(viewer.viewed_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-gray-200 pt-5">
            <button onClick={() => setDeleteModalOpen(true)} className="px-4 py-2 rounded-full text-sm font-semibold border border-red-300 text-red-700 hover:bg-red-50">
              Deactivate Account (OTP Required)
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="li-card p-6 space-y-5">
          <div><label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-1">Headline</label><input id="headline" name="headline" className="li-input" value={formData.headline} onChange={handleChange} /></div>
          <div><label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label><input id="location" name="location" className="li-input" value={formData.location} onChange={handleChange} /></div>
          <div><label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">Education</label><textarea id="education" name="education" rows={3} className="li-input" value={formData.education} onChange={handleChange} /></div>
          <div><label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">Experience</label><textarea id="experience" name="experience" rows={4} className="li-input" value={formData.experience} onChange={handleChange} /></div>
          <div><label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">Skills</label><textarea id="skills" name="skills" rows={2} className="li-input" value={formData.skills} onChange={handleChange} /></div>
          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            <div>
              <label htmlFor="profile_picture_file" className="block text-sm font-medium text-gray-700 mb-1">Upload Profile Picture</label>
              <input id="profile_picture_file" type="file" accept="image/png,image/jpeg,image/webp" className="li-input" onChange={handleProfilePictureSelect} />
            </div>
            {profilePictureSrc && (
              <img src={profilePictureSrc} alt="Profile preview" className="h-24 w-24 rounded-full object-cover border border-gray-200" />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={uploadProfilePicture} className="li-btn-secondary" disabled={uploadingPicture}>
                {uploadingPicture ? 'Uploading...' : 'Upload Picture'}
              </button>
              <button type="button" onClick={() => { setProfilePictureFile(null); setProfilePicturePreview(profile.profile_picture_url || ''); }} className="li-btn-secondary">
                Reset Preview
              </button>
            </div>
          </div>
          <div><label htmlFor="profile_picture_url" className="block text-sm font-medium text-gray-700 mb-1">Profile Picture URL (optional fallback)</label><input id="profile_picture_url" name="profile_picture_url" className="li-input" value={formData.profile_picture_url} onChange={handleChange} /></div>
          <div><label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label><textarea id="bio" name="bio" rows={4} className="li-input" value={formData.bio} onChange={handleChange} /></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"><input type="checkbox" name="privacy_show_email" checked={formData.privacy_show_email} onChange={handleChange} />Show email on profile</label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"><input type="checkbox" name="privacy_show_phone" checked={formData.privacy_show_phone} onChange={handleChange} />Show phone on profile</label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"><input type="checkbox" name="privacy_show_location" checked={formData.privacy_show_location} onChange={handleChange} />Show location on profile</label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"><input type="checkbox" name="allow_profile_view_tracking" checked={formData.allow_profile_view_tracking} onChange={handleChange} />Enable profile view tracking</label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
            <label className="rounded-lg border border-gray-200 px-3 py-2">Headline privacy
              <select name="privacy_headline" className="li-input mt-2" value={formData.privacy_headline} onChange={handleChange}>
                <option value="public">Public</option>
                <option value="connections">Connections-only</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="rounded-lg border border-gray-200 px-3 py-2">Location privacy
              <select name="privacy_location" className="li-input mt-2" value={formData.privacy_location} onChange={handleChange}>
                <option value="public">Public</option>
                <option value="connections">Connections-only</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="rounded-lg border border-gray-200 px-3 py-2">Bio privacy
              <select name="privacy_bio" className="li-input mt-2" value={formData.privacy_bio} onChange={handleChange}>
                <option value="public">Public</option>
                <option value="connections">Connections-only</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="rounded-lg border border-gray-200 px-3 py-2">Education privacy
              <select name="privacy_education" className="li-input mt-2" value={formData.privacy_education} onChange={handleChange}>
                <option value="public">Public</option>
                <option value="connections">Connections-only</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="rounded-lg border border-gray-200 px-3 py-2">Experience privacy
              <select name="privacy_experience" className="li-input mt-2" value={formData.privacy_experience} onChange={handleChange}>
                <option value="public">Public</option>
                <option value="connections">Connections-only</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="rounded-lg border border-gray-200 px-3 py-2">Skills privacy
              <select name="privacy_skills" className="li-input mt-2" value={formData.privacy_skills} onChange={handleChange}>
                <option value="public">Public</option>
                <option value="connections">Connections-only</option>
                <option value="private">Private</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="li-btn-primary">Save Changes</button>
            <button type="button" onClick={() => { setEditing(false); setError(''); setSuccess(''); fetchProfile(); }} className="li-btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="li-card w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Deactivate Account</h3>
            <p className="text-sm text-gray-600">This action requires OTP verification through virtual keyboard.</p>
            <div className="flex gap-2">
              <button type="button" onClick={requestDeleteOtp} className="li-btn-secondary" disabled={deleteLoading}>Send OTP</button>
              <button type="button" onClick={() => { setDeleteModalOpen(false); setDeleteOtp(''); }} className="li-btn-secondary">Cancel</button>
            </div>

            <OTPKeyboard value={deleteOtp} onDigit={appendDeleteOtpDigit} onBackspace={backspaceDeleteOtp} onClear={clearDeleteOtp} />
            <button type="button" onClick={confirmDeleteAccount} className="li-btn-primary w-full" disabled={deleteLoading || deleteOtp.length !== 6}>
              Confirm Deactivation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
