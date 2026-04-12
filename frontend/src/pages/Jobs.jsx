import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { companyAPI, jobsAPI, resumeAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const toDateTimeLocalValue = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const createDefaultJobForm = () => {
  const defaultDeadline = new Date();
  defaultDeadline.setDate(defaultDeadline.getDate() + 30);

  return {
    company_id: '',
    title: '',
    description: '',
    required_skills: '',
    location: '',
    work_mode: 'on-site',
    employment_type: 'full-time',
    salary_min: '',
    salary_max: '',
    application_deadline: toDateTimeLocalValue(defaultDeadline),
  };
};

const APPLICATION_FLOW = ['Applied', 'Reviewed', 'Interviewed'];

const getApplicationTimeline = (status) => {
  if (status === 'Offer') {
    return [...APPLICATION_FLOW, 'Offer'];
  }

  if (status === 'Rejected') {
    return [...APPLICATION_FLOW, 'Rejected'];
  }

  return APPLICATION_FLOW;
};

const normalizeResumeList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.resumes)) {
    return payload.resumes;
  }

  return [];
};

const Jobs = () => {
  const { user } = useAuth();
  const isRecruiter = useMemo(() => user?.role === 'recruiter' || user?.role === 'admin', [user]);

  const [jobs, setJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyDirectory, setCompanyDirectory] = useState({});
  const [resumes, setResumes] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applicants, setApplicants] = useState([]);

  const [search, setSearch] = useState({
    keyword: '',
    company: '',
    location: '',
    skill: '',
    remote: false,
    employment_type: '',
  });
  const [jobForm, setJobForm] = useState(createDefaultJobForm());
  const [companyForm, setCompanyForm] = useState({ name: '', description: '', location: '', website: '' });
  const [coverNotes, setCoverNotes] = useState({});
  const [selectedResumeIds, setSelectedResumeIds] = useState({});
  const [applicantUpdates, setApplicantUpdates] = useState({});
  const [deadlineDrafts, setDeadlineDrafts] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadJobs();
    loadCompanyDirectory();
    if (isRecruiter) {
      loadCompanies();
    } else {
      loadMyApplications();
      loadResumes();
    }
  }, [isRecruiter]);

  const loadJobs = async (params = {}) => {
    try {
      setLoading(true);
      const response = await jobsAPI.search(params);
      const jobRows = response.data || [];
      setJobs(jobRows);
      setDeadlineDrafts((previous) => {
        const updated = { ...previous };
        jobRows.forEach((job) => {
          if (!(job.id in updated)) {
            updated[job.id] = job.application_deadline
              ? toDateTimeLocalValue(new Date(job.application_deadline))
              : '';
          }
        });
        return updated;
      });
    } catch {
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadMyApplications = async () => {
    try {
      const response = await jobsAPI.listMyApplications();
      setMyApplications(response.data || []);
    } catch {
      setError('Failed to load your applications');
    }
  };

  const loadCompanies = async () => {
    try {
      const response = await companyAPI.getMyCompanies();
      setCompanies(response.data || []);
    } catch {
      setError('Failed to load your companies');
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

  const loadCompanyDirectory = async () => {
    try {
      const response = await companyAPI.list();
      const directory = (response.data || []).reduce((accumulator, company) => {
        accumulator[company.id] = company.name;
        return accumulator;
      }, {});
      setCompanyDirectory(directory);
    } catch {
      setCompanyDirectory({});
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setError('');
    const params = {
      keyword: search.keyword || undefined,
      company: search.company || undefined,
      location: search.location || undefined,
      skill: search.skill || undefined,
      remote: search.remote || undefined,
      employment_type: search.employment_type || undefined,
    };
    await loadJobs(params);
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
      await loadMyApplications();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to apply');
    }
  };

  const handleCreateCompany = async (event) => {
    event.preventDefault();
    try {
      setError('');
      setSuccess('');
      await companyAPI.create(companyForm);
      setCompanyForm({ name: '', description: '', location: '', website: '' });
      setSuccess('Company created');
      await loadCompanies();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create company');
    }
  };

  const handleCreateJob = async (event) => {
    event.preventDefault();
    try {
      setError('');
      setSuccess('');
      const payload = {
        ...jobForm,
        company_id: Number(jobForm.company_id),
        salary_min: jobForm.salary_min ? Number(jobForm.salary_min) : null,
        salary_max: jobForm.salary_max ? Number(jobForm.salary_max) : null,
        application_deadline: jobForm.application_deadline || null,
      };
      await jobsAPI.create(payload);
      setJobForm(createDefaultJobForm());
      setSuccess('Job posted');
      await loadJobs();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to post job');
    }
  };

  const handleLoadApplicants = async (jobId) => {
    setSelectedJobId(jobId);
    try {
      const response = await jobsAPI.listApplicants(jobId);
      setApplicants(response.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load applicants');
    }
  };

  const handleUpdateApplication = async (applicationId, status) => {
    try {
      const currentApplication = applicants.find((item) => item.id === applicationId);
      const pendingUpdate = applicantUpdates[applicationId] || {};

      await jobsAPI.updateApplicationStatus(applicationId, {
        status: pendingUpdate.status || status || currentApplication?.status || 'Reviewed',
        recruiter_notes: pendingUpdate.recruiter_notes || '',
        is_shortlisted: Boolean(pendingUpdate.is_shortlisted),
      });
      setSuccess('Application status updated');
      if (selectedJobId) {
        await handleLoadApplicants(selectedJobId);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleApplicantUpdateChange = (applicationId, field, value) => {
    setApplicantUpdates((previous) => ({
      ...previous,
      [applicationId]: {
        ...previous[applicationId],
        [field]: value,
      },
    }));
  };

  const handleUpdateDeadline = async (jobId) => {
    const value = deadlineDrafts[jobId];
    if (!value) {
      setError('Please choose a deadline time before saving.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await jobsAPI.update(jobId, { application_deadline: value });
      setSuccess('Application deadline updated');
      await loadJobs();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update deadline');
    }
  };

  const formatDateTime = (value) => {
    if (!value) {
      return 'Not set';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleString();
  };

  const isDeadlinePassed = (deadline) => {
    if (!deadline) {
      return false;
    }
    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }
    return parsed.getTime() < Date.now();
  };

  return (
    <div className="space-y-5">
      <div className="li-card p-6">
        <h1 className="li-title">Jobs</h1>
        <p className="li-subtitle mt-2">Discover opportunities, apply quickly, and manage hiring in one place.</p>
      </div>

      {error && <div className="li-card border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="li-card border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <form onSubmit={handleSearch} className="li-card p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="li-input" placeholder="Keyword" value={search.keyword} onChange={(e) => setSearch((prev) => ({ ...prev, keyword: e.target.value }))} />
        <input className="li-input" placeholder="Company" value={search.company} onChange={(e) => setSearch((prev) => ({ ...prev, company: e.target.value }))} />
        <input className="li-input" placeholder="Location" value={search.location} onChange={(e) => setSearch((prev) => ({ ...prev, location: e.target.value }))} />
        <input className="li-input" placeholder="Skill" value={search.skill} onChange={(e) => setSearch((prev) => ({ ...prev, skill: e.target.value }))} />
        <select className="li-input" value={search.employment_type} onChange={(e) => setSearch((prev) => ({ ...prev, employment_type: e.target.value }))}>
          <option value="">All types</option>
          <option value="full-time">Full-time</option>
          <option value="internship">Internship</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={search.remote} onChange={(e) => setSearch((prev) => ({ ...prev, remote: e.target.checked }))} />
          Remote only
        </label>
        <button className="li-btn-primary md:col-span-3" type="submit">Search Jobs</button>
      </form>

      <div className="li-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 text-sm font-semibold text-gray-900">Job Listings</div>
        {loading ? (
          <div className="p-5 text-sm text-gray-600">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-5 text-sm text-gray-600">No jobs found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <div key={job.id} className="p-5 space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{job.title}</p>
                    <p className="text-sm text-gray-700">{companyDirectory[job.company_id] || `Company #${job.company_id}`}</p>
                    <p className="text-sm text-gray-600">{job.location || 'Location N/A'} • {job.work_mode} • {job.employment_type}</p>
                    <p className="text-xs text-gray-500 mt-1">Posted: {formatDateTime(job.created_at)}</p>
                    <p className={`text-xs mt-1 ${isDeadlinePassed(job.application_deadline) ? 'text-red-600' : 'text-gray-500'}`}>
                      Apply by: {formatDateTime(job.application_deadline)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/companies/${job.company_id}/jobs`} className="li-btn-secondary">
                      View Company
                    </Link>
                    {isRecruiter ? (
                      <button type="button" className="li-btn-secondary" onClick={() => handleLoadApplicants(job.id)}>View Applicants</button>
                    ) : (
                      <button type="button" className="li-btn-primary" disabled={isDeadlinePassed(job.application_deadline)} onClick={() => handleApply(job.id)}>
                        {isDeadlinePassed(job.application_deadline) ? 'Deadline Passed' : 'Apply'}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700">{job.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="rounded-full bg-gray-100 px-3 py-1">{job.work_mode}</span>
                  <span className="rounded-full bg-gray-100 px-3 py-1">{job.employment_type}</span>
                </div>
                {isRecruiter && (
                  <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <p className="text-xs text-gray-600">Update application deadline</p>
                    <div className="flex flex-col md:flex-row gap-2">
                      <input
                        type="datetime-local"
                        className="li-input md:flex-1"
                        value={deadlineDrafts[job.id] || ''}
                        onChange={(e) => setDeadlineDrafts((previous) => ({ ...previous, [job.id]: e.target.value }))}
                      />
                      <button type="button" className="li-btn-secondary" onClick={() => handleUpdateDeadline(job.id)}>
                        Save Deadline
                      </button>
                    </div>
                  </div>
                )}
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

      {!isRecruiter && (
        <div className="li-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 text-sm font-semibold text-gray-900">My Applications</div>
          {myApplications.length === 0 ? (
            <div className="p-5 text-sm text-gray-600">No applications yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myApplications.map((application) => (
                <div key={application.id} className="p-5 text-sm space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-700">
                      Application #{application.id} • {companyDirectory[jobs.find((job) => job.id === application.job_id)?.company_id] || 'Company'} • {jobs.find((job) => job.id === application.job_id)?.title || `Job #${application.job_id}`}
                    </span>
                    <span className="font-semibold text-[#0a66c2] rounded-full bg-blue-50 px-3 py-1">{application.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getApplicationTimeline(application.status).map((stage) => {
                      const isCurrent = stage === application.status;
                      const stageIndex = APPLICATION_FLOW.indexOf(stage);
                      const currentIndex = APPLICATION_FLOW.indexOf(application.status);
                      const isCompleted = stageIndex >= 0 && currentIndex >= 0 && stageIndex < currentIndex;
                      const isTerminalReached = (application.status === 'Offer' || application.status === 'Rejected') && stageIndex >= 0;

                      return (
                        <span
                          key={stage}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isCurrent
                              ? stage === 'Offer'
                                ? 'bg-green-100 text-green-800'
                                : stage === 'Rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-800'
                              : isCompleted || isTerminalReached
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {stage}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isRecruiter && (
        <>
          <form onSubmit={handleCreateCompany} className="li-card p-5 space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Create Company</h2>
            <input className="li-input" placeholder="Company name" value={companyForm.name} onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))} required />
            <input className="li-input" placeholder="Location" value={companyForm.location} onChange={(e) => setCompanyForm((prev) => ({ ...prev, location: e.target.value }))} />
            <input className="li-input" placeholder="Website" value={companyForm.website} onChange={(e) => setCompanyForm((prev) => ({ ...prev, website: e.target.value }))} />
            <textarea className="li-input" rows={3} placeholder="Description" value={companyForm.description} onChange={(e) => setCompanyForm((prev) => ({ ...prev, description: e.target.value }))} />
            <button className="li-btn-primary" type="submit">Create Company</button>
          </form>

          <form onSubmit={handleCreateJob} className="li-card p-5 space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Post Job</h2>
            <select className="li-input" value={jobForm.company_id} onChange={(e) => setJobForm((prev) => ({ ...prev, company_id: e.target.value }))} required>
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
            <input className="li-input" placeholder="Title" value={jobForm.title} onChange={(e) => setJobForm((prev) => ({ ...prev, title: e.target.value }))} required />
            <textarea className="li-input" rows={3} placeholder="Description" value={jobForm.description} onChange={(e) => setJobForm((prev) => ({ ...prev, description: e.target.value }))} required />
            <input className="li-input" placeholder="Required skills (comma separated)" value={jobForm.required_skills} onChange={(e) => setJobForm((prev) => ({ ...prev, required_skills: e.target.value }))} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select className="li-input" value={jobForm.work_mode} onChange={(e) => setJobForm((prev) => ({ ...prev, work_mode: e.target.value }))}>
                <option value="on-site">On-site</option>
                <option value="remote">Remote</option>
              </select>
              <select className="li-input" value={jobForm.employment_type} onChange={(e) => setJobForm((prev) => ({ ...prev, employment_type: e.target.value }))}>
                <option value="full-time">Full-time</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="li-input" placeholder="Location" value={jobForm.location} onChange={(e) => setJobForm((prev) => ({ ...prev, location: e.target.value }))} />
              <input className="li-input" type="number" placeholder="Salary min" value={jobForm.salary_min} onChange={(e) => setJobForm((prev) => ({ ...prev, salary_min: e.target.value }))} />
              <input className="li-input" type="number" placeholder="Salary max" value={jobForm.salary_max} onChange={(e) => setJobForm((prev) => ({ ...prev, salary_max: e.target.value }))} />
            </div>
            <input className="li-input" type="datetime-local" value={jobForm.application_deadline} onChange={(e) => setJobForm((prev) => ({ ...prev, application_deadline: e.target.value }))} required />
            <button className="li-btn-primary" type="submit">Post Job</button>
          </form>

          {selectedJobId && (
            <div className="li-card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 text-sm font-semibold text-gray-900">Applicants for Job #{selectedJobId}</div>
              {applicants.length === 0 ? (
                <div className="p-5 text-sm text-gray-600">No applicants yet.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {applicants.map((application) => (
                    <div key={application.id} className="p-5 space-y-3 text-sm">
                      <span className="text-gray-700 block">
                        {application.candidate_name || `Candidate #${application.candidate_id}`}
                        {application.candidate_email ? ` (${application.candidate_email})` : ''}
                        {' '}• Current: {application.status}
                      </span>
                      <p className="text-xs text-gray-500">Applied at: {formatDateTime(application.created_at)}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <select
                          className="li-input"
                          value={applicantUpdates[application.id]?.status || application.status}
                          onChange={(e) => handleApplicantUpdateChange(application.id, 'status', e.target.value)}
                        >
                          {['Applied', 'Reviewed', 'Interviewed', 'Rejected', 'Offer'].map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={Boolean(applicantUpdates[application.id]?.is_shortlisted ?? application.is_shortlisted)}
                            onChange={(e) => handleApplicantUpdateChange(application.id, 'is_shortlisted', e.target.checked)}
                          />
                          Shortlist candidate
                        </label>
                        <button
                          type="button"
                          onClick={() => handleUpdateApplication(application.id)}
                          className="li-btn-primary"
                        >
                          Save Update
                        </button>
                      </div>
                      <textarea
                        className="li-input"
                        rows={2}
                        placeholder="Recruiter notes"
                        value={applicantUpdates[application.id]?.recruiter_notes ?? application.recruiter_notes ?? ''}
                        onChange={(e) => handleApplicantUpdateChange(application.id, 'recruiter_notes', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Jobs;
