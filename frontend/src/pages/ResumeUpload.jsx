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
      <div className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 px-8 py-6">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mr-4 shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Resume Manager</h2>
              <p className="text-green-100 text-sm flex items-center mt-1">
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                All files are encrypted & secure
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-shake">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl animate-pulse">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleUpload} className="mb-8 bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">
                  📄 Upload New Resume
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-green-500 file:to-emerald-600 file:text-white hover:file:from-green-600 hover:file:to-emerald-700 file:cursor-pointer file:transition-all file:duration-200 file:shadow-lg hover:file:shadow-xl cursor-pointer"
                  />
                  {file && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-green-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <svg className="h-8 w-8 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <span className="text-green-600 font-semibold">✓ Ready</span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">Supported formats: PDF, DOCX (Max 10MB)</p>
              </div>

              <div className="flex items-center bg-white p-4 rounded-xl border border-green-200">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="isPublic" className="ml-3 block text-sm font-medium text-gray-900 cursor-pointer">
                  Make resume publicly visible to recruiters
                </label>
              </div>

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading & Encrypting...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload & Encrypt Resume
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="border-t-2 border-gray-200 pt-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="h-7 w-7 mr-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              My Resumes
            </h3>
            
            {loading ? (
              <div className="flex flex-col justify-center items-center py-16">
                <div className="relative">
                  <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-t-4 border-green-600"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">Loading resumes...</p>
              </div>
            ) : resumes.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-4 text-lg font-medium text-gray-600">No resumes uploaded yet</p>
                <p className="mt-2 text-sm text-gray-500">Upload your first resume to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="border-2 border-gray-200 rounded-2xl p-6 flex items-center justify-between hover:border-green-300 hover:shadow-xl transition-all duration-200 bg-white"
                  >
                    <div className="flex-1 flex items-start">
                      <div className="flex-shrink-0 h-14 w-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4 shadow-md">
                        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 flex items-center">
                          {resume.original_filename}
                          <span className="ml-3 text-green-600 text-sm flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Encrypted
                          </span>
                        </h4>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                          <span className="flex items-center">
                            <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                            {(resume.file_size / 1024).toFixed(2)} KB
                          </span>
                          <span className="flex items-center">
                            <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(resume.uploaded_at).toLocaleDateString()}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${resume.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {resume.is_public ? (
                              <>
                                <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                Public
                              </>
                            ) : (
                              <>
                                <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                </svg>
                                Private
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 ml-4">
                      <button
                        onClick={() => handleDownload(resume.id, resume.original_filename)}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 text-sm font-semibold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(resume.id)}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 text-sm font-semibold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Toggle
                      </button>
                      <button
                        onClick={() => handleDelete(resume.id)}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 text-sm font-semibold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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
