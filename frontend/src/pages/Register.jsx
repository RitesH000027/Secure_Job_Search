import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const PENDING_REGISTRATION_KEY = 'pending_registration';

const getApiErrorMessage = (err, fallbackMessage) => {
  const detail = err?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item?.loc) ? item.loc.join('.') : '';
        return field ? `${field}: ${item?.msg || 'Validation error'}` : item?.msg || 'Validation error';
      })
      .join(', ');
  }

  if (detail && typeof detail === 'object') {
    return detail.msg || JSON.stringify(detail);
  }

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  return fallbackMessage;
};

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    mobile_number: '',
    password: '',
    full_name: '',
    role: 'user',
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('register');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    try {
      const pendingRegistration = JSON.parse(sessionStorage.getItem(PENDING_REGISTRATION_KEY) || 'null');
      if (!pendingRegistration) {
        return;
      }

      setFormData((previous) => ({
        ...previous,
        email: previous.email || pendingRegistration.email || '',
        mobile_number: previous.mobile_number || pendingRegistration.mobile_number || '',
      }));
    } catch {
      sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
    }
  }, []);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const normalizedPayload = {
      ...formData,
      email: formData.email.trim(),
      mobile_number: formData.mobile_number.trim(),
    };

    try {
      await authAPI.register(normalizedPayload);
      sessionStorage.setItem(
        PENDING_REGISTRATION_KEY,
        JSON.stringify({ email: normalizedPayload.email, mobile_number: normalizedPayload.mobile_number })
      );
      setStep('verify');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const normalizedOtp = otp.replace(/\D/g, '').slice(0, 6);

    if (normalizedOtp.length !== 6) {
      setLoading(false);
      setError('Enter a valid 6-digit OTP.');
      return;
    }

    let pendingRegistration = null;
    try {
      pendingRegistration = JSON.parse(sessionStorage.getItem(PENDING_REGISTRATION_KEY) || 'null');
    } catch {
      pendingRegistration = null;
    }

    const resolvedEmail = formData.email.trim() || pendingRegistration?.email || '';
    const resolvedMobileNumber = formData.mobile_number.trim() || pendingRegistration?.mobile_number || '';

    if (!resolvedEmail || !resolvedMobileNumber) {
      setLoading(false);
      setError('Registration context missing (email/mobile). Please register again.');
      setStep('register');
      return;
    }

    try {
      const response = await authAPI.verifyOTP({
        email: resolvedEmail,
        mobile_number: resolvedMobileNumber,
        otp: normalizedOtp,
      });

      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
      navigate('/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, 'OTP verification failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);

    let pendingRegistration = null;
    try {
      pendingRegistration = JSON.parse(sessionStorage.getItem(PENDING_REGISTRATION_KEY) || 'null');
    } catch {
      pendingRegistration = null;
    }

    const resolvedEmail = formData.email.trim() || pendingRegistration?.email || '';
    const resolvedMobileNumber = formData.mobile_number.trim() || pendingRegistration?.mobile_number || '';

    if (!resolvedEmail || !resolvedMobileNumber) {
      setLoading(false);
      setError('Registration context missing (email/mobile). Please register again.');
      setStep('register');
      return;
    }

    try {
      await authAPI.resendOTP({
        email: resolvedEmail,
        mobile_number: resolvedMobileNumber,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to resend OTP.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center px-3 sm:px-4 py-4 sm:py-8">
      <div className="w-full max-w-lg li-card p-4 sm:p-8 shadow-sm">
        <img src="/CB.png" alt="CareerBridge" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-gray-200 bg-white" />
        <h1 className="mt-4 sm:mt-5 text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">
          {step === 'register' ? 'Join your professional network' : 'Verify your account'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {step === 'register' ? 'Build your profile and start connecting.' : 'Enter the OTP sent to your email and mobile.'}
        </p>

        {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        {step === 'register' ? (
          <form className="mt-4 sm:mt-6 space-y-2.5 sm:space-y-3" onSubmit={handleRegister}>
            <input className="li-input" name="full_name" placeholder="Full name" value={formData.full_name} onChange={handleChange} required />
            <input className="li-input" name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
            <input className="li-input" name="mobile_number" type="tel" placeholder="Mobile number" value={formData.mobile_number} onChange={handleChange} required />
            <input className="li-input" name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
            <div>
              <label htmlFor="role" className="block text-xs text-gray-500 mb-1">Register as</label>
              <select id="role" name="role" className="li-input" value={formData.role} onChange={handleChange}>
                <option value="user">User (Job Seeker)</option>
                <option value="recruiter">Recruiter</option>
              </select>
            </div>
            <p className="text-xs text-gray-500">Password must contain uppercase, lowercase, and a number.</p>
            <button type="submit" className="li-btn-primary w-full !py-2" disabled={loading}>
              {loading ? 'Creating account...' : 'Agree & Join'}
            </button>
          </form>
        ) : (
          <form className="mt-4 sm:mt-6 space-y-2.5 sm:space-y-3" onSubmit={handleVerifyOTP}>
            <input
              className="li-input text-center text-lg sm:text-xl tracking-[0.18em] sm:tracking-[0.3em]"
              maxLength="6"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="OTP"
              required
            />
            <button type="submit" className="li-btn-primary w-full !py-2" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
            <button type="button" onClick={handleResendOTP} className="li-btn-secondary w-full !py-2" disabled={loading}>
              Resend OTP
            </button>
          </form>
        )}

        <p className="mt-4 sm:mt-5 text-sm text-gray-600">
          Already on the platform?{' '}
          <Link to="/login" className="text-[#0a66c2] font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
