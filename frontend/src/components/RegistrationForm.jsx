import React, { useState } from 'react';
import { User, Calendar, Hash, Phone, Mail, Lock, Sparkles, AlertCircle, ArrowRight, ArrowLeft, GraduationCap } from 'lucide-react';

export default function RegistrationForm({ onSuccess, onBack }) {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    regNo: '',
    year: '1', // Default 1st Year
    phone: '',
    email: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

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

    if (!formData.year || !['1', '2', '3', '4'].includes(formData.year)) {
      newErrors.year = 'Year is mandatory (Choose 1, 2, 3, or 4)';
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
      const response = await fetch('/cseAI/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed.');
      }

      // Clear form & trigger success handler with issued user details
      onSuccess(data.user);
    } catch (err) {
      setApiError(err.message || 'Failed to connect to registration server.');
    } finally {
      setLoading(false);
    }
  };

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
              </select>
              <GraduationCap className="input-icon" size={18} />
            </div>
            {errors.year && <div className="error-text"><AlertCircle size={14} /> {errors.year}</div>}
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
            <strong>Password:</strong>your password will be set automatically to your <strong>Date of Birth (DOB)</strong>. You can use your Email/Reg No and DOB to check your registration pass anytime.
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
