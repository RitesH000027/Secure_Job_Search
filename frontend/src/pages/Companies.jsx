import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { companyAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const defaultCompanyForm = {
  name: '',
  description: '',
  location: '',
  website: '',
};

const Companies = () => {
  const { user } = useAuth();
  const isRecruiter = useMemo(() => user?.role === 'recruiter' || user?.role === 'admin', [user]);

  const [allCompanies, setAllCompanies] = useState([]);
  const [myCompanies, setMyCompanies] = useState([]);
  const [companyForm, setCompanyForm] = useState(defaultCompanyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCompanies();
  }, [isRecruiter]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError('');

      const [allResponse, myResponse] = await Promise.all([
        companyAPI.list(),
        isRecruiter ? companyAPI.getMyCompanies() : Promise.resolve({ data: [] }),
      ]);

      setAllCompanies(allResponse.data || []);
      setMyCompanies(myResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (event) => {
    event.preventDefault();

    try {
      setError('');
      setSuccess('');
      await companyAPI.create(companyForm);
      setCompanyForm(defaultCompanyForm);
      setSuccess('Company created');
      await loadCompanies();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create company');
    }
  };

  return (
    <div className="space-y-5">
      <div className="li-card p-6">
        <h1 className="li-title">Companies</h1>
        <p className="li-subtitle mt-2">Browse organizations and manage your company profiles.</p>
      </div>

      {error && <div className="li-card border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="li-card border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {isRecruiter && (
        <form onSubmit={handleCreateCompany} className="li-card p-5 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Create Company</h2>
          <input
            className="li-input"
            placeholder="Company name"
            value={companyForm.name}
            onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            className="li-input"
            placeholder="Location"
            value={companyForm.location}
            onChange={(e) => setCompanyForm((prev) => ({ ...prev, location: e.target.value }))}
          />
          <input
            className="li-input"
            placeholder="Website"
            value={companyForm.website}
            onChange={(e) => setCompanyForm((prev) => ({ ...prev, website: e.target.value }))}
          />
          <textarea
            className="li-input"
            rows={3}
            placeholder="Description"
            value={companyForm.description}
            onChange={(e) => setCompanyForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <button className="li-btn-primary" type="submit">Create Company</button>
        </form>
      )}

      {isRecruiter && (
        <div className="li-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 text-sm font-semibold text-gray-900">My Companies</div>
          {loading ? (
            <div className="p-5 text-sm text-gray-600">Loading companies...</div>
          ) : myCompanies.length === 0 ? (
            <div className="p-5 text-sm text-gray-600">No companies found for your account.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myCompanies.map((company) => (
                <div key={company.id} className="p-5">
                  <Link to={`/companies/${company.id}/jobs`} className="text-base font-semibold text-[#0a66c2] hover:underline">
                    {company.name}
                  </Link>
                  <p className="text-sm text-gray-600 mt-1">{company.location || 'Location N/A'}</p>
                  {company.website && <p className="text-sm text-[#0a66c2] mt-1 break-all">{company.website}</p>}
                  {company.description && <p className="text-sm text-gray-700 mt-2">{company.description}</p>}
                  <div className="mt-2">
                    <Link to={`/companies/${company.id}/jobs`} className="text-sm font-medium text-[#0a66c2] hover:underline">
                      View posted jobs
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="li-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 text-sm font-semibold text-gray-900">All Companies</div>
        {loading ? (
          <div className="p-5 text-sm text-gray-600">Loading companies...</div>
        ) : allCompanies.length === 0 ? (
          <div className="p-5 text-sm text-gray-600">No companies available yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {allCompanies.map((company) => (
              <div key={company.id} className="p-5">
                <Link to={`/companies/${company.id}/jobs`} className="text-base font-semibold text-[#0a66c2] hover:underline">
                  {company.name}
                </Link>
                <p className="text-sm text-gray-600 mt-1">{company.location || 'Location N/A'}</p>
                {company.website && <p className="text-sm text-[#0a66c2] mt-1 break-all">{company.website}</p>}
                {company.description && <p className="text-sm text-gray-700 mt-2">{company.description}</p>}
                <div className="mt-2">
                  <Link to={`/companies/${company.id}/jobs`} className="text-sm font-medium text-[#0a66c2] hover:underline">
                    View posted jobs
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Companies;