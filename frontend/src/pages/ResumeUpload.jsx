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
    <div className="px-4 py-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Resume Manager</h2>
          <p className="text-sm text-gray-500 mt-1">Upload and manage your encrypted resumes</p>
        </div>

        <div className="px-6 py-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <form onSubmit={handleUpload} className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload New Resume
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                />
                {file && (
                  <div className="mt-2 p-3 bg-white rounded border border-gray-300">
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">PDF or DOCX, max 10MB</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                  Make resume publicly visible to recruiters
                </label>
              </div>

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload Resume'}
              </button>
            </div>
          </form>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">My Resumes</h3>
            
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : resumes.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-base text-gray-600">No resumes uploaded yet</p>
                <p className="mt-1 text-sm text-gray-500">Upload your first resume to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="border border-gray-200 rounded-md p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-base font-medium text-gray-900">{resume.original_filename}</h4>
                        <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                          <span>{(resume.file_size / 1024).toFixed(2)} KB</span>
                          <span>•</span>
                          <span>{new Date(resume.uploaded_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className={resume.is_public ? 'text-green-600' : 'text-gray-500'}>
                            {resume.is_public ? 'Public' : 'Private'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleDownload(resume.id, resume.original_filename)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleToggleVisibility(resume.id)}
                          className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                        >
                          Toggle
                        </button>
                        <button
                          onClick={() => handleDelete(resume.id)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
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
