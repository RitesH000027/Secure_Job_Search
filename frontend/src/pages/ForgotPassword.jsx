import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const OTPKeyboard = ({ value, onDigit, onBackspace, onClear }) => {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="space-y-3">
      <input className="li-input text-center tracking-[0.35em]" value={value} readOnly placeholder="••••••" />
      <div className="grid grid-cols-3 gap-2">
        {digits.map((digit) => (
          <button key={digit} type="button" onClick={() => onDigit(digit)} className="li-btn-secondary !rounded-lg !py-2">
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

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await authAPI.requestPasswordReset(email.trim());
      setSuccess('If the email exists, a reset OTP has been sent.');
      setStep('confirm');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request password reset OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const normalizedOtp = otp.replace(/\D/g, '').slice(0, 6);
    if (normalizedOtp.length !== 6) {
      setError('Enter a valid 6-digit OTP.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.confirmPasswordReset({
        email: email.trim(),
        otp: normalizedOtp,
        new_password: newPassword,
      });
      setSuccess('Password reset successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const appendOtpDigit = (digit) => {
    setOtp((previous) => (previous.length >= 6 ? previous : `${previous}${digit}`));
  };

  const backspaceOtp = () => {
    setOtp((previous) => previous.slice(0, -1));
  };

  const clearOtp = () => {
    setOtp('');
  };

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center px-4">
      <div className="w-full max-w-md li-card p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Forgot Password</h1>
        <p className="mt-2 text-sm text-gray-600">
          {step === 'request'
            ? 'Request a reset OTP for your account email.'
            : 'Enter OTP via virtual keyboard and set a new password.'}
        </p>

        {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        {success && <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</div>}

        {step === 'request' ? (
          <form className="mt-6 space-y-4" onSubmit={handleRequestOtp}>
            <input
              type="email"
              className="li-input"
              placeholder="Account Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button type="submit" className="li-btn-primary w-full" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send Reset OTP'}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleConfirmReset}>
            <OTPKeyboard value={otp} onDigit={appendOtpDigit} onBackspace={backspaceOtp} onClear={clearOtp} />
            <input
              type="password"
              className="li-input"
              placeholder="New Password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <input
              type="password"
              className="li-input"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            <button type="submit" className="li-btn-primary w-full" disabled={loading}>
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
            <button type="button" className="li-btn-secondary w-full" onClick={() => setStep('request')}>
              Request OTP Again
            </button>
          </form>
        )}

        <p className="mt-5 text-sm text-gray-600">
          Back to{' '}
          <Link className="text-[#0a66c2] font-semibold hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
