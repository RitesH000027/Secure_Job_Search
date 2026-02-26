import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 rounded-2xl p-8 shadow-2xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Welcome back, {user?.full_name}! 👋
            </h1>
            <p className="text-purple-100 text-lg">Ready to manage your career opportunities?</p>
          </div>
          <div className="hidden md:block">
            <div className="h-24 w-24 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
              <svg className="h-14 w-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow-xl rounded-2xl transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-lg">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-semibold text-gray-500 truncate">Profile Status</dt>
                  <dd className="flex items-baseline mt-1">
                    <div className="text-3xl font-bold text-gray-900">
                      {user?.is_verified ? (
                        <span className="flex items-center text-green-600">
                          <svg className="h-8 w-8 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      ) : (
                        <span className="text-yellow-600">Pending</span>
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-xl rounded-2xl transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-semibold text-gray-500 truncate">Account Type</dt>
                  <dd className="flex items-baseline mt-1">
                    <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent capitalize">
                      {user?.role}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-xl rounded-2xl transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-4 shadow-lg">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-semibold text-gray-500 truncate">2FA Status</dt>
                  <dd className="flex items-baseline mt-1">
                    <div className="text-2xl font-bold text-gray-600">
                      Disabled
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <svg className="h-7 w-7 mr-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <a
            href="/profile"
            className="group relative block p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl hover:from-blue-100 hover:to-indigo-100 hover:border-blue-400 transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">Update Profile</h3>
                <p className="text-sm text-gray-600">Edit your professional information and privacy settings</p>
              </div>
            </div>
          </a>
          <a
            href="/resume"
            className="group relative block p-8 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl hover:from-green-100 hover:to-emerald-100 hover:border-green-400 transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">Upload Resume</h3>
                <p className="text-sm text-gray-600">Securely upload and manage your encrypted resumes</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
