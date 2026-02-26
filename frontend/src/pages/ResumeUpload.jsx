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
      await resumeAPI.upload(formData);
      setSuccess('Resume uploaded and encrypted successfully!');
      setFile(null);
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

  const handleToggleVisibility = async (id) => {
    try {
      await resumeAPI.toggleVisibility(id);
      setSuccess('Resume visibility updated');
      loadResumes();
    } catch (err) {
      setError('Failed to update visibility');
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Resume Management</h2>
          <p className="mt-1 text-sm text-gray-600">Upload and manage your encrypted resumes</p>
        </div>

        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 rounded-md">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <form onSubmit={handleUpload} className="mb-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Resume (PDF or DOCX, max 10MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                  Make resume publicly visible
                </label>
              </div>

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading & Encrypting...' : 'Upload Resume'}
              </button>
            </div>
          </form>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">My Resumes</h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : resumes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No resumes uploaded yet</p>
            ) : (
              <div className="space-y-4">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{resume.original_filename}</h4>
                      <div className="mt-1 text-sm text-gray-500 space-x-4">
                        <span>Size: {(resume.file_size / 1024).toFixed(2)} KB</span>
                        <span>Uploaded: {new Date(resume.uploaded_at).toLocaleDateString()}</span>
                        <span className={`px-2 py-1 rounded ${resume.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {resume.is_public ? 'Public' : 'Private'}
                        </span>
                        <span className="text-green-600">🔒 Encrypted</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(resume.id, resume.original_filename)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(resume.id)}
                        className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                      >
                        Toggle Visibility
                      </button>
                      <button
                        onClick={() => handleDelete(resume.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;
