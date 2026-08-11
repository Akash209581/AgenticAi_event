import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { User, Calendar, Hash, Phone, Mail, Lock, Sparkles, AlertCircle, ArrowRight, ArrowLeft, GraduationCap, Copy, Check, KeyRound } from 'lucide-react';
import { apiFetch } from '../config/api';

export default function RegistrationForm({ onSuccess, onProceedToLogin, onBack }) {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    regNo: '',
    year: '1', // Default 1st Year
    gender: 'Male',
    phone: '',
    email: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Strict Rule: Phone Number must consist of ONLY numbers and max 10 characters
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, phone: numericValue }));
      if (errors.phone) {
        setErrors(prev => ({ ...prev, phone: '' }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is mandatory';
    }

    if (!formData.dob.trim()) {
      newErrors.dob = 'Date of Birth (DOB) is mandatory';
    }

    if (!formData.regNo.trim()) {
      newErrors.regNo = 'Registration Number is mandatory';
    }

    const validYears = ['1', '2', '3', '4', 'M.Tech (1st year)', 'M.Tech (2nd year)'];
    if (!formData.year || !validYears.includes(formData.year)) {
      newErrors.year = 'Year is mandatory';
    }


    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is mandatory';
    } else if (formData.phone.length !== 10) {
      newErrors.phone = 'Phone number MUST be strictly 10 digits';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email Id is mandatory';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid Email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    setLoading(true);

    try {
      const { response, data } = await apiFetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed.');
      }

      if (data.token) {
        localStorage.setItem('vucse_auth_token', data.token);
      }

      setRegisteredUser(data.user);

      if (onSuccess) {
        onSuccess(data.user);
      }

      // Confetti celebration for generated ID
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f2fe', '#4facfe', '#a855f7']
        });
      } catch (err) {
        console.warn('Confetti trigger ignored:', err);
      }

    } catch (err) {
      setApiError(err.message || 'Failed to connect to registration server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    if (registeredUser?.aiId) {
      navigator.clipboard.writeText(registeredUser.aiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegisterAnother = () => {
    setRegisteredUser(null);
    setFormData({
      name: '',
      dob: '',
      regNo: '',
      year: '1',
      gender: 'Male',
      phone: '',
      email: ''
    });
    setErrors({});
    setApiError('');
  };

  // Render Post-Registration Generated ID Screen
  if (registeredUser) {
    return (
      <div className="cyber-card registration-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.8rem' }}>
            <div style={{ background: 'rgba(0, 242, 254, 0.1)', padding: '1rem', borderRadius: '50%', border: '1px solid rgba(0, 242, 254, 0.4)' }}>
              <Sparkles size={36} color="#00f2fe" />
            </div>
          </div>
          <h2 className="card-title" style={{ color: '#00f2fe' }}>
            Registration Successful!
          </h2>
          <p className="card-subtitle" style={{ color: '#94a3b8', marginTop: '0.2rem' }}>
            Your unique Agentic AI Day ID has been generated.
          </p>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          margin: '1.25rem 0',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '1.5px', marginBottom: '0.5rem' }}>
            YOUR GENERATED REGISTRATION ID
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
            fontWeight: '900',
            color: '#00f2fe',
            letterSpacing: '2px',
            margin: '0.4rem 0 1rem 0',
            textShadow: '0 0 15px rgba(0, 242, 254, 0.4)'
          }}>
            {registeredUser.aiId}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={handleCopyId}
              className="btn-secondary"
              style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem' }}
            >
              {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              {copied ? 'Copied ID!' : 'Copy Registration ID'}
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            textAlign: 'left',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>ATTENDEE NAME</span>
              <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{registeredUser.name}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>REGISTRATION NO</span>
              <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{registeredUser.regNo}</strong>
            </div>
          </div>
        </div>

        <div className="info-box" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          <Lock size={20} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Next Step: Log In to View Pass</strong>
            <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', color: '#334155' }}>
              Your Digital Pass is protected. Please proceed to login using your <strong>Registration Number or AI ID</strong> and <strong>Date of Birth (DOB)</strong>.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => onProceedToLogin && onProceedToLogin(registeredUser.aiId || registeredUser.regNo)}
            className="btn-primary"
            style={{ width: '100%', maxWidth: '350px', justifyContent: 'center' }}
          >
            <KeyRound size={20} /> Proceed to Login
          </button>

          <button
            type="button"
            onClick={handleRegisterAnother}
            className="btn-secondary"
            style={{ width: '100%', maxWidth: '350px', justifyContent: 'center' }}
          >
            Register Another Participant
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cyber-card registration-card">
      {onBack && (
        <div className="back-bar">
          <button onClick={onBack} className="back-link" type="button">
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
        </div>
      )}

      <div className="card-header">
        <h2 className="card-title">
          Agentic AI Day Registration
        </h2>
      </div>

      {apiError && (
        <div className="toast-banner toast-error">
          <AlertCircle size={20} />
          <div>{apiError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          {/* Full Name */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="name">
                <User size={16} /> Name <span className="req-star">*</span>
              </label>
            </div>
            <div className="input-wrapper">
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`cyber-input ${errors.name ? 'input-error' : ''}`}
                required
              />
              <User className="input-icon" size={18} />
            </div>
            {errors.name && <div className="error-text"><AlertCircle size={14} /> {errors.name}</div>}
          </div>

          {/* Date of Birth (DOB) */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="dob">
                <Calendar size={16} /> Date of Birth (DOB) <span className="req-star">*</span>
              </label>
            </div>
            <div className="input-wrapper">
              <input
                id="dob"
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                max="2011-12-31"
                className={`cyber-input ${errors.dob ? 'input-error' : ''}`}
                required
              />
              <Calendar className="input-icon" size={18} />
            </div>
            {errors.dob && <div className="error-text"><AlertCircle size={14} /> {errors.dob}</div>}
          </div>

          {/* Registration Number */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="regNo">
                <Hash size={16} /> Registration Number <span className="req-star">*</span>
              </label>
            </div>
            <div className="input-wrapper">
              <input
                id="regNo"
                type="text"
                name="regNo"
                value={formData.regNo}
                onChange={handleChange}
                placeholder="e.g. 211FA04000"
                className={`cyber-input ${errors.regNo ? 'input-error' : ''}`}
                required
              />
              <Hash className="input-icon" size={18} />
            </div>
            {errors.regNo && <div className="error-text"><AlertCircle size={14} /> {errors.regNo}</div>}
          </div>

          {/* Year Dropdown Field (1, 2, 3, 4) */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="year">
                <GraduationCap size={16} /> Year <span className="req-star">*</span>
              </label>
            </div>
            <div className="input-wrapper">
              <select
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className={`cyber-select ${errors.year ? 'input-error' : ''}`}
                required
              >
                <option value="1">1st Year (1)</option>
                <option value="2">2nd Year (2)</option>
                <option value="3">3rd Year (3)</option>
                <option value="4">4th Year (4)</option>
                <option value="M.Tech (1st year)">M.Tech (1st year)</option>
                <option value="M.Tech (2nd year)">M.Tech (2nd year)</option>
              </select>

              <GraduationCap className="input-icon" size={18} />
            </div>
            {errors.year && <div className="error-text"><AlertCircle size={14} /> {errors.year}</div>}
          </div>

          {/* Gender Dropdown Field */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="gender">
                <User size={16} /> Gender <span className="req-star">*</span>
              </label>
            </div>
            <div className="input-wrapper">
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="cyber-select"
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <User className="input-icon" size={18} />
            </div>
          </div>

          {/* Phone Number (Strictly 10 digits) */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="phone">
                <Phone size={16} /> Phone Number <span className="req-star">*</span>
              </label>
              <span className="rule-hint">{formData.phone.length}/10 digits</span>
            </div>
            <div className="input-wrapper">
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className={`cyber-input ${errors.phone ? 'input-error' : ''}`}
                maxLength={10}
                required
              />
              <Phone className="input-icon" size={18} />
            </div>
            {errors.phone && <div className="error-text"><AlertCircle size={14} /> {errors.phone}</div>}
          </div>

          {/* Email ID */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="email">
                <Mail size={16} /> Email Id <span className="req-star">*</span>
              </label>
            </div>
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="student@university.edu"
                className={`cyber-input ${errors.email ? 'input-error' : ''}`}
                required
              />
              <Mail className="input-icon" size={18} />
            </div>
            {errors.email && <div className="error-text"><AlertCircle size={14} /> {errors.email}</div>}
          </div>
        </div>

        {/* Automatic Password Notice Box */}
        <div className="info-box">
          <Lock size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Password:</strong> your password will be set automatically to your <strong>Date of Birth (DOB)</strong>. You can use your Registration No / AI ID and DOB to check your registration pass anytime.
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', maxWidth: '350px', justifyContent: 'center' }}
          >
            {loading ? 'Generating AI ID...' : 'Complete Registration'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </div>
      </form>
    </div>
  );
}

