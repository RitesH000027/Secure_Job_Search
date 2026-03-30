import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { companyAPI, jobsAPI, resumeAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const normalizeResumeList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.resumes)) {
    return payload.resumes;
  }

  return [];
};

const CompanyJobs = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const isRecruiter = useMemo(() => user?.role === 'recruiter' || user?.role === 'admin', [user]);

  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [coverNotes, setCoverNotes] = useState({});
  const [selectedResumeIds, setSelectedResumeIds] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (!isRecruiter) {
      loadResumes();
    }
  }, [isRecruiter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const [companyResponse, jobsResponse] = await Promise.all([
        companyAPI.getById(id),
        jobsAPI.search({ active_only: true, company_id: Number(id) }),
      ]);

      const companyData = companyResponse.data;
      setCompany(companyData);

      setJobs(jobsResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load company jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadResumes = async () => {
    try {
      const response = await resumeAPI.list();
      setResumes(normalizeResumeList(response.data));
    } catch {
      setResumes([]);
    }
  };

  const handleApply = async (jobId) => {
    try {
      setError('');
      setSuccess('');
      const selectedResumeId = selectedResumeIds[jobId];
      if (!selectedResumeId) {
        setError('Please select a resume before applying.');
        return;
      }

      await jobsAPI.apply(jobId, {
        resume_id: Number(selectedResumeId),
        cover_note: coverNotes[jobId] || '',
      });
      setSuccess('Application submitted');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to apply');
    }
  };

  return (
    <div className="space-y-5">
      <div className="li-card p-6">
        <h1 className="li-title">Company Jobs</h1>
        <p className="li-subtitle mt-2">Browse openings from one company and apply quickly.</p>
      </div>

      <div>
        <Link to="/companies" className="text-sm font-medium text-[#0a66c2] hover:underline">← Back to Companies</Link>
      </div>

      {error && <div className="li-card border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="li-card border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {loading ? (
        <div className="li-card p-5 text-sm text-gray-600">Loading company details...</div>
      ) : company ? (
        <div className="li-card p-5 space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">{company.name}</h2>
          <p className="text-sm text-gray-600">{company.location || 'Location N/A'}</p>
          {company.website && <p className="text-sm text-[#0a66c2] break-all">{company.website}</p>}
          {company.description && <p className="text-sm text-gray-700">{company.description}</p>}
        </div>
      ) : null}

      <div className="li-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 text-sm font-semibold text-gray-900">Open Jobs</div>
        {loading ? (
          <div className="p-5 text-sm text-gray-600">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-5 text-sm text-gray-600">No active jobs posted by this company yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <div key={job.id} className="p-5 space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{job.title}</p>
                    <p className="text-sm text-gray-600">{job.location || 'Location N/A'} • {job.work_mode} • {job.employment_type}</p>
                  </div>
                  {!isRecruiter && (
                    <button className="li-btn-primary" onClick={() => handleApply(job.id)}>Apply</button>
                  )}
                </div>
                <p className="text-sm text-gray-700">{job.description}</p>
                {!isRecruiter && (
                  <div className="space-y-2">
                    <select
                      className="li-input"
                      value={selectedResumeIds[job.id] || ''}
                      onChange={(e) => setSelectedResumeIds((previous) => ({ ...previous, [job.id]: e.target.value }))}
                    >
                      <option value="">Select resume for application</option>
                      {resumes.map((resume) => (
                        <option key={resume.id} value={resume.id}>{resume.original_filename}</option>
                      ))}
                    </select>
                    <textarea
                      className="li-input"
                      rows={2}
                      placeholder="Cover note (optional)"
                      value={coverNotes[job.id] || ''}
                      onChange={(e) => setCoverNotes((prev) => ({ ...prev, [job.id]: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyJobs;