import React, { useState, useEffect } from 'react';
import { Download, X, Phone, Mail, Shield, CheckCircle2, FileSpreadsheet, Eye } from 'lucide-react';

/**
 * ExportOptionsModal component allows admins/reviewers to configure what contact
 * details (Phone Number, Email) should be included or excluded prior to downloading CSV data.
 */
export default function ExportOptionsModal({
  isOpen,
  title = 'Export CSV Data',
  subtitle = '',
  recordCount = null,
  onClose,
  onConfirm
}) {
  const [includePhone, setIncludePhone] = useState(true);
  const [includeEmail, setIncludeEmail] = useState(true);

  // Reset to full details whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setIncludePhone(true);
      setIncludeEmail(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Preset selector handler
  const setPreset = (preset) => {
    if (preset === 'both') {
      setIncludePhone(true);
      setIncludeEmail(true);
    } else if (preset === 'phone_only') {
      setIncludePhone(true);
      setIncludeEmail(false);
    } else if (preset === 'email_only') {
      setIncludePhone(false);
      setIncludeEmail(true);
    } else if (preset === 'none') {
      setIncludePhone(false);
      setIncludeEmail(false);
    }
  };

  // Determine active preset key
  const activePreset =
    includePhone && includeEmail
      ? 'both'
      : includePhone && !includeEmail
      ? 'phone_only'
      : !includePhone && includeEmail
      ? 'email_only'
      : 'none';

  const handleDownload = () => {
    onConfirm({ includePhone, includeEmail });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 8, 18, 0.82)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.96), rgba(15, 23, 42, 0.98))',
          border: '1px solid rgba(0, 242, 254, 0.35)',
          boxShadow: '0 25px 60px -15px rgba(0, 242, 254, 0.25), 0 0 35px rgba(0, 0, 0, 0.8)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '520px',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.4rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(0, 242, 254, 0.08), rgba(99, 102, 241, 0.08))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(99, 102, 241, 0.2))',
                border: '1px solid rgba(0, 242, 254, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00f2fe'
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 800, letterSpacing: '0.3px' }}>
                {title}
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{subtitle || 'Select contact fields to include in export'}</span>
                {recordCount !== null && recordCount !== undefined && (
                  <span
                    style={{
                      background: 'rgba(0, 242, 254, 0.15)',
                      color: '#00f2fe',
                      padding: '0.1rem 0.5rem',
                      borderRadius: '10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: '1px solid rgba(0, 242, 254, 0.3)'
                    }}
                  >
                    {recordCount} Records
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* Quick Presets */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '0.65rem' }}>
              Choose Export Preset
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
              {/* Preset 1: Full */}
              <button
                type="button"
                onClick={() => setPreset('both')}
                style={{
                  background: activePreset === 'both' ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(59, 130, 246, 0.15))' : 'rgba(255, 255, 255, 0.03)',
                  border: activePreset === 'both' ? '1.5px solid #00f2fe' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '0.75rem 0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: activePreset === 'both' ? '#00f2fe' : '#f1f5f9' }}>
                    Full Contact Info
                  </span>
                  {activePreset === 'both' && <CheckCircle2 size={15} color="#00f2fe" />}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Includes Phone & Email</div>
              </button>

              {/* Preset 2: Phone Only */}
              <button
                type="button"
                onClick={() => setPreset('phone_only')}
                style={{
                  background: activePreset === 'phone_only' ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))' : 'rgba(255, 255, 255, 0.03)',
                  border: activePreset === 'phone_only' ? '1.5px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '0.75rem 0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: activePreset === 'phone_only' ? '#4ade80' : '#f1f5f9' }}>
                    Phone Only
                  </span>
                  {activePreset === 'phone_only' && <CheckCircle2 size={15} color="#22c55e" />}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Phone yes, Email omitted</div>
              </button>

              {/* Preset 3: Email Only */}
              <button
                type="button"
                onClick={() => setPreset('email_only')}
                style={{
                  background: activePreset === 'email_only' ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(139, 92, 246, 0.15))' : 'rgba(255, 255, 255, 0.03)',
                  border: activePreset === 'email_only' ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '0.75rem 0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: activePreset === 'email_only' ? '#c084fc' : '#f1f5f9' }}>
                    Email Only
                  </span>
                  {activePreset === 'email_only' && <CheckCircle2 size={15} color="#a855f7" />}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Email yes, Phone omitted</div>
              </button>

              {/* Preset 4: Without (None) */}
              <button
                type="button"
                onClick={() => setPreset('none')}
                style={{
                  background: activePreset === 'none' ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(249, 115, 22, 0.15))' : 'rgba(255, 255, 255, 0.03)',
                  border: activePreset === 'none' ? '1.5px solid #eab308' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '0.75rem 0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: activePreset === 'none' ? '#facc15' : '#f1f5f9' }}>
                    Without Contacts
                  </span>
                  {activePreset === 'none' && <CheckCircle2 size={15} color="#eab308" />}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>No Phone & No Email</div>
              </button>
            </div>
          </div>

          {/* Granular Field Toggles */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              padding: '0.9rem 1.1rem',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b', fontWeight: 700, marginBottom: '0.75rem' }}>
              Custom Checkbox Configuration
            </div>

            {/* Phone checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Phone size={16} color={includePhone ? '#00f2fe' : '#64748b'} />
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: includePhone ? '#f1f5f9' : '#94a3b8' }}>
                    Include Phone Number
                  </span>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>
                    Adds contact number columns to CSV
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includePhone}
                onChange={(e) => setIncludePhone(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#00f2fe',
                  cursor: 'pointer'
                }}
              />
            </label>

            {/* Email checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Mail size={16} color={includeEmail ? '#00f2fe' : '#64748b'} />
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: includeEmail ? '#f1f5f9' : '#94a3b8' }}>
                    Include Email Address
                  </span>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>
                    Adds email ID columns to CSV
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeEmail}
                onChange={(e) => setIncludeEmail(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#00f2fe',
                  cursor: 'pointer'
                }}
              />
            </label>
          </div>

          {/* Status summary banner */}
          <div
            style={{
              padding: '0.65rem 0.9rem',
              borderRadius: '10px',
              background: 'rgba(0, 242, 254, 0.05)',
              border: '1px solid rgba(0, 242, 254, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.78rem',
              color: '#cbd5e1'
            }}
          >
            <Shield size={16} color="#00f2fe" style={{ flexShrink: 0 }} />
            <div>
              Export includes: <strong>Name, ID, Reg No, Event Details</strong>
              {includePhone && <span style={{ color: '#4ade80' }}> + Phone</span>}
              {includeEmail && <span style={{ color: '#c084fc' }}> + Email</span>}
              {!includePhone && !includeEmail && <span style={{ color: '#facc15' }}> (Contact info stripped)</span>}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            background: 'rgba(10, 15, 29, 0.7)'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              padding: '0.6rem 1.2rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            style={{
              background: 'linear-gradient(135deg, #00f2fe, #3b82f6)',
              border: 'none',
              color: '#04101e',
              padding: '0.6rem 1.4rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 15px rgba(0, 242, 254, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <Download size={16} /> Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
