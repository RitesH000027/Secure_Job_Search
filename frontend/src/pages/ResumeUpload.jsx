import { useState, useEffect } from 'react';
import { resumeAPI } from '../services/api';

const ResumeUpload = () => {
  const [resumes, setResumes] = useState([]);
  const [file, setFile] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      const response = await resumeAPI.list();
      setResumes(response.data.resumes || response.data);
    } catch (err) {
      setError('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only PDF and DOCX files are allowed');
        setFile(null);
        return;
      }
      
      // Validate file size (10MB)
      if (selectedFile.size > 10485760) {
        setError('File size must be less than 10MB');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
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
      setSuccess('Resume uploaded and encrypted successfully!');
      setFile(null);
      setIsPublic(false);
      e.target.reset();
      loadResumes();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id, filename) => {
    try {
      const response = await resumeAPI.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download resume');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    try {
      await resumeAPI.delete(id);
      setSuccess('Resume deleted successfully');
      loadResumes();
    } catch (err) {
      setError('Failed to delete resume');
    }
  };

  const handleToggleVisibility = async (id, currentVisibility) => {
    try {
      await resumeAPI.toggleVisibility(id, !currentVisibility);
      setSuccess('Resume visibility updated');
      loadResumes();
    } catch (err) {
      setError('Failed to update visibility');
    }
  };

  return (
    <div className="space-y-4">
      <div className="li-card p-6">
        <h1 className="text-xl font-semibold text-gray-900">Resume Manager</h1>
        <p className="mt-1 text-sm text-gray-600">Upload encrypted resumes and control recruiter visibility.</p>
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
            onChange={(e) => setIsPublic(e.target.checked)}
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
                  <button onClick={() => handleDownload(resume.id, resume.original_filename)} className="li-btn-primary">Download</button>
                  <button onClick={() => handleToggleVisibility(resume.id, resume.is_public)} className="li-btn-secondary">Toggle Visibility</button>
                  <button onClick={() => handleDelete(resume.id)} className="px-4 py-2 rounded-full text-sm font-semibold border border-red-300 text-red-700 hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeUpload;
