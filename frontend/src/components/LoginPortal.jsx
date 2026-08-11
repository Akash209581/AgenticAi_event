import React, { useState, useEffect } from 'react';
import { KeyRound, Hash, Calendar, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../config/api';

export default function LoginPortal({ onLoginSuccess, onBack, initialIdentifier = '' }) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialIdentifier) {
      setIdentifier(initialIdentifier);
    }
  }, [initialIdentifier]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your Registration Number or AI ID.');
      return;
    }

    if (!password.trim()) {
      setError('Please select your Date of Birth (DOB).');
      return;
    }

    setLoading(true);

    try {
      const { response, data } = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed.');
      }

      if (data.token) {
        localStorage.setItem('vucse_auth_token', data.token);
      }

      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Error connecting to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 180px)',
      width: '100%',
      padding: '1.5rem 1rem',
      boxSizing: 'border-box'
    }}>
      <div className="cyber-card registration-card" style={{ maxWidth: '560px', width: '100%', margin: '0 auto' }}>
        {onBack && (
          <div className="back-bar">
            <button onClick={onBack} className="back-link" type="button">
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
          </div>
        )}

        <div className="card-header">
          <h2 className="card-title">
            <KeyRound color="#00f2fe" size={26} />
            Agentic AI Day Login
          </h2>
        </div>

        {error && (
          <div className="toast-banner toast-error">
            <AlertCircle size={20} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="login-id">
                  <Hash size={16} /> Registration Number or AI ID <span className="req-star">*</span>
                </label>
              </div>
              <div className="input-wrapper">
                <input
                  id="login-id"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. regID or AI ID"
                  className="cyber-input"
                  required
                />
                <Hash className="input-icon" size={18} />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="login-pwd">
                  <Calendar size={16} /> Password (Date of Birth) <span className="req-star">*</span>
                </label>
              </div>
              <div className="input-wrapper">
                <input
                  id="login-pwd"
                  type="date"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  max="2011-12-31"
                  className="cyber-input"
                  required
                />
                <Calendar className="input-icon" size={18} />
              </div>
              <span
                style={{
                  marginTop: '0.4rem',
                  color: '#0f172a',
                  background: '#e2e8f0',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  display: 'inline-block',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  border: '1px solid #cbd5e1'
                }}
              >
                Select the DOB used during registration.
              </span>
            </div>
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', maxWidth: '350px', justifyContent: 'center' }}
            >
              {loading ? 'Logging in...' : 'Login'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
