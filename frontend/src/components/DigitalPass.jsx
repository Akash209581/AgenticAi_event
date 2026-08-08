import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { Copy, Check, Download, Sparkles, User, Calendar, Hash, Phone, Mail, Award, LogOut } from 'lucide-react';

export default function DigitalPass({ user, isNew = false, onReset, onLogout }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate QR Code
    if (canvasRef.current && user) {
      const qrData = JSON.stringify({
        aiId: user.aiId,
        name: user.name,
        regNo: user.regNo,
        event: 'Agentic AI Day 2026'
      });
      QRCode.toCanvas(canvasRef.current, qrData, {
        width: 130,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    }

    // Trigger celebration confetti on new registration
    if (isNew) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f2fe', '#4facfe', '#a855f7']
      });
    }
  }, [user, isNew]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.aiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!user) return null;

  return (
    <div className="badge-pass-container">
      {isNew && (
        <div className="toast-banner toast-success" style={{ width: '100%', maxWidth: '450px' }}>
          <Sparkles size={20} />
          <div>
            <strong>Registration Successful!</strong> Your unique Agentic AI Day ID has been generated.
          </div>
        </div>
      )}

      {/* Futuristic Ticket Pass */}
      <div className="pass-card">
        <div className="pass-header">
          <div>
            <div className="pass-event-title">AGENTIC AI DAY 2026</div>
            <div className="pass-date">CSE DEPARTMENT • OFFICIAL PASS</div>
          </div>
          <Award size={28} color="#00f2fe" />
        </div>

        <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', letterSpacing: '1px' }}>
          GENERATED REGISTRATION ID
        </div>

        {/* AI ID Display */}
        <div className="pass-ai-id">
          {user.aiId}
        </div>

        {/* User Details Grid */}
        <div className="pass-details">
          <div className="detail-item">
            <span className="detail-label">ATTENDEE NAME</span>
            <span className="detail-value">{user.name}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">REGISTRATION NO.</span>
            <span className="detail-value">{user.regNo}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">YEAR OF STUDY</span>
            <span className="detail-value">{user.year ? `Year ${user.year}` : 'N/A'}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">DATE OF BIRTH (DOB)</span>
            <span className="detail-value">{user.dob}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">PHONE NUMBER</span>
            <span className="detail-value">{user.phone}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">EMAIL ID</span>
            <span className="detail-value">{user.email}</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="qr-section">
          <canvas ref={canvasRef} className="qr-canvas"></canvas>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={handleCopyId} className="btn-secondary">
          {copied ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
          {copied ? 'ID Copied!' : 'Copy Unique ID'}
        </button>

        <button onClick={handlePrint} className="btn-primary">
          <Download size={18} />
          Print / Save Digital Pass
        </button>

        {onReset && (
          <button onClick={onReset} className="btn-secondary">
            Register Another Participant
          </button>
        )}

        {onLogout && (
          <button onClick={onLogout} className="btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
            <LogOut size={18} /> Logout
          </button>
        )}
      </div>
    </div>
  );
}
