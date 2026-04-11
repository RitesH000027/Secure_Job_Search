import { useState, useEffect } from 'react';
import { authAPI, resumeAPI } from '../services/api';

const OTPKeyboard = ({ value, onDigit, onBackspace, onClear }) => {
  const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="space-y-3">
      <input className="li-input text-center tracking-[0.35em]" value={value} readOnly placeholder="••••••" />
      <div className="grid grid-cols-3 gap-2">
        {keypadDigits.map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => onDigit(digit)}
            className="li-btn-secondary !rounded-lg !py-2"
          >
            {digit}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onBackspace} className="li-btn-secondary !rounded-lg !py-2">
          Backspace
        </button>
        <button type="button" onClick={onClear} className="li-btn-secondary !rounded-lg !py-2">
          Clear
        </button>
      </div>
    </div>
  );
};

const ResumeUpload = () => {
  const [resumes, setResumes] = useState([]);
  const [file, setFile] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpAction, setOtpAction] = useState(null);
  const [otpTargetResume, setOtpTargetResume] = useState(null);

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      const response = await resumeAPI.list();
      setResumes(response.data.resumes || response.data);
    } catch {
      setError('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only PDF and DOCX files are allowed');
        setFile(null);
        return;
      }

      if (selectedFile.size > 10485760) {
        setError('File size must be less than 10MB');
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      await resumeAPI.upload(formData, isPublic);
      setSuccess('Resume uploaded, encrypted, and PKI-signed successfully.');
      setFile(null);
      setIsPublic(false);
      event.target.reset();
      loadResumes();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const openOtpModal = (action, resume) => {
    setOtpAction(action);
    setOtpTargetResume(resume);
    setOtpCode('');
    setOtpModalOpen(true);
    setError('');
    setSuccess('');
  };

  const requestActionOtp = async () => {
    if (!otpAction) {
      return;
    }

    try {
      setOtpLoading(true);
      await authAPI.requestHighRiskOTP(otpAction);
      setSuccess('OTP sent to your registered email/mobile. Enter it using the virtual keyboard.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyResumeIntegrity = async (resumeId) => {
    try {
      const response = await resumeAPI.verifyIntegrity(resumeId);
      const ok = response.data?.hash_matches && response.data?.signature_valid;
      setSuccess(ok ? 'Resume integrity verified using PKI signature.' : 'Resume integrity verification failed.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to verify resume integrity');
    }
  };

  const handleToggleVisibility = async (id, currentVisibility) => {
    try {
      await resumeAPI.toggleVisibility(id, !currentVisibility);
      setSuccess('Resume visibility updated');
      loadResumes();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update visibility');
    }
  };

  const executeOtpAction = async () => {
    if (!otpTargetResume || !otpAction) {
      return;
    }

    if (otpCode.length !== 6) {
      setError('Enter a valid 6-digit OTP');
      return;
    }

    try {
      setOtpLoading(true);
      if (otpAction === 'resume_download') {
        const response = await resumeAPI.download(otpTargetResume.id, otpCode);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', otpTargetResume.original_filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setSuccess('Resume downloaded successfully');
      }

      if (otpAction === 'resume_delete') {
        await resumeAPI.delete(otpTargetResume.id, otpCode);
        setSuccess('Resume deleted successfully');
        await loadResumes();
      }

      setOtpModalOpen(false);
      setOtpCode('');
      setOtpAction(null);
      setOtpTargetResume(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'High-risk action failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const appendOtpDigit = (digit) => {
    setOtpCode((previous) => (previous.length >= 6 ? previous : `${previous}${digit}`));
  };

  const backspaceOtp = () => {
    setOtpCode((previous) => previous.slice(0, -1));
  };

  const clearOtp = () => {
    setOtpCode('');
  };

  return (
    <div className="space-y-4">
      <div className="li-card p-6">
        <h1 className="text-xl font-semibold text-gray-900">Resume Manager</h1>
        <p className="mt-1 text-sm text-gray-600">Upload encrypted resumes, verify PKI integrity, and protect high-risk actions with OTP virtual keyboard.</p>
      </div>

      {error && <div className="li-card border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="li-card border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <form onSubmit={handleUpload} className="li-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload New Resume</label>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#0a66c2] file:text-white hover:file:bg-[#004182]"
          />
          <p className="mt-2 text-xs text-gray-500">Accepted formats: PDF or DOCX, max size 10MB</p>
        </div>

        {file && (
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#0a66c2]"
          />
          Make resume visible to recruiters
        </label>

        <button type="submit" disabled={uploading || !file} className="li-btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
          {uploading ? 'Uploading...' : 'Upload Resume'}
        </button>
      </form>

      <div className="li-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">My Resumes</h2>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-gray-600">Loading resumes...</div>
        ) : resumes.length === 0 ? (
          <div className="p-5 text-sm text-gray-600">No resumes uploaded yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {resumes.map((resume) => (
              <div key={resume.id} className="p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{resume.original_filename}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(resume.file_size / 1024).toFixed(2)} KB • {new Date(resume.uploaded_at).toLocaleDateString()} • {resume.is_public ? 'Public' : 'Private'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openOtpModal('resume_download', resume)} className="li-btn-primary">Download</button>
                  <button onClick={() => handleToggleVisibility(resume.id, resume.is_public)} className="li-btn-secondary">Toggle Visibility</button>
                  <button onClick={() => verifyResumeIntegrity(resume.id)} className="li-btn-secondary">Verify Integrity</button>
                  <button onClick={() => openOtpModal('resume_delete', resume)} className="px-4 py-2 rounded-full text-sm font-semibold border border-red-300 text-red-700 hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {otpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="li-card w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">High-Risk Action Verification</h3>
            <p className="text-sm text-gray-600">
              Action: {otpAction === 'resume_delete' ? 'Delete Resume' : 'Download Resume'}
            </p>

            <div className="flex gap-2">
              <button type="button" onClick={requestActionOtp} className="li-btn-secondary" disabled={otpLoading}>
                {otpLoading ? 'Sending OTP...' : 'Send OTP'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpModalOpen(false);
                  setOtpCode('');
                  setOtpAction(null);
                  setOtpTargetResume(null);
                }}
                className="li-btn-secondary"
              >
                Cancel
              </button>
            </div>

            <OTPKeyboard value={otpCode} onDigit={appendOtpDigit} onBackspace={backspaceOtp} onClear={clearOtp} />

            <button type="button" onClick={executeOtpAction} className="li-btn-primary w-full" disabled={otpLoading || otpCode.length !== 6}>
              Confirm Action
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
