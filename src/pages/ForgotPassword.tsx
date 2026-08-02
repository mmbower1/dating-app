import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Logo from '../components/Logo';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-logo">
            <Logo size="lg" showText={true} />
          </div>
          {submitted ? (
            <>
              <h1>Check your email</h1>
              <p className="auth-subtitle">If that address is registered, we sent a reset link. It expires in 1 hour.</p>
              <p className="auth-link">
                <Link to="/login">Back to sign in</Link>
              </p>
            </>
          ) : (
            <>
              <h1>Forgot password?</h1>
              <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>
              {error && <p className="error">{error}</p>}
              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
              <p className="auth-link">
                <Link to="/login">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
