import React, { useState, useEffect } from 'react';
import { Shield, Lock, FileText, CheckCircle2, XCircle, Clock, Search, RefreshCw, Filter, ExternalLink, MessageSquare, AlertTriangle, User, Users, Sparkles, ArrowLeft, LogOut, Download, Video } from 'lucide-react';
import { apiFetch, getAssetUrl } from '../config/api';

export default function PosterReviewerDashboard({ onBack, mode = 'poster' }) {
  const isReelsMode = mode === 'reels' || mode === 'reels-reviewer' || (typeof window !== 'undefined' && window.location.pathname.includes('/reels'));
  
  const expectedPasskey = isReelsMode ? 'Honeyjoe@777' : 'vijitha202602';
  const tokenStorageKey = isReelsMode ? 'vucse_reels_reviewer_token' : 'vucse_poster_reviewer_token';
  const reviewerPanelName = isReelsMode ? 'Reels Competition Review Panel' : 'Poster & Paper Review Panel';

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem(tokenStorageKey);
  });
  const [passkey, setPasskey] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

  // Modal State for Reject Explanation & Resubmit Request
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [resubmittingItem, setResubmittingItem] = useState(null);
  const [resubmitReason, setResubmitReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError('');

    const targetMode = isReelsMode ? 'reels' : 'poster';

    // 1. Try dedicated endpoint first
    try {
      const { data } = await apiFetch(`/reviewer-submissions?mode=${targetMode}`);
      if (data && data.success && Array.isArray(data.submissions)) {
        const filtered = data.submissions.filter(s => {
          const title = String(s.eventTitle || '').toLowerCase();
          const eId = String(s.eventId || '').toLowerCase();
          const sub = s.submission || {};
          if (isReelsMode) {
            return eId === 'creative-1' || title.includes('reel') || Boolean(sub.reelLink);
          } else {
            return (eId === 'technical-3' || title.includes('poster') || title.includes('paper') || Boolean(sub.posterFile || sub.posterLink)) && !title.includes('reel');
          }
        });
        setSubmissions(filtered);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Fallback to /registrations for reviewer fetch:', err.message);
    }

    // 2. Fallback: fetch /registrations and /team-registrations
    try {
      const adminToken = localStorage.getItem('vucse_admin_token') || 'ADMIN_SECRET_KEY_VUCSE_2026';
      const { data: regData } = await apiFetch('/registrations', {
        headers: { 'x-admin-token': adminToken }
      });

      let teamList = [];
      try {
        const { data: teamData } = await apiFetch('/team-registrations', {
          headers: { 'x-admin-token': adminToken }
        });
        if (teamData && teamData.teams) teamList = teamData.teams;
      } catch (e) {}

      if (regData && regData.users) {
        const list = [];
        regData.users.forEach(u => {
          if (u.registeredEvents && Array.isArray(u.registeredEvents)) {
            u.registeredEvents.forEach(e => {
              if (e.submission && (e.submission.posterFile || e.submission.posterLink || e.submission.reelLink)) {
                const title = String(e.title || '').toLowerCase();
                const eId = String(e.id || '').toLowerCase();
                const sub = e.submission || {};

                const isReel = eId === 'creative-1' || title.includes('reel') || Boolean(sub.reelLink);
                const isPoster = eId === 'technical-3' || title.includes('poster') || title.includes('paper') || Boolean(sub.posterFile || sub.posterLink);

                if (isReelsMode && !isReel) return;
                if (!isReelsMode && (!isPoster || title.includes('reel'))) return;

                const uAiId = (u.aiId || '').toUpperCase();
                const team = teamList.find(t =>
                  ((t.eventId && t.eventId === e.id) || (t.eventTitle && e.title && t.eventTitle.toLowerCase() === e.title.toLowerCase())) &&
                  t.members && t.members.some(m => (m.aiId || '').toUpperCase() === uAiId)
                );

                const existingIdx = list.findIndex(item =>
                  item.eventId === e.id &&
                  ((team && item.teamName && item.teamName === team.teamName) ||
                   (item.studentAiId && item.studentAiId === (e.submission.submittedBy?.aiId || u.aiId)))
                );

                if (existingIdx === -1) {
                  list.push({
                    submissionId: `${u.aiId || u.regNo}_${e.id}`,
                    studentName: u.name,
                    studentAiId: u.aiId,
                    studentRegNo: u.regNo,
                    studentYear: u.year,
                    studentEmail: u.email,
                    studentPhone: u.phone,
                    eventTitle: e.title,
                    eventId: e.id,
                    categoryId: e.categoryId,
                    teamName: team ? team.teamName : null,
                    teamMembers: team ? team.members : null,
                    submission: e.submission,
                    reviewStatus: e.submission.reviewStatus || 'PENDING',
                    rejectionReason: e.submission.rejectionReason || '',
                    reviewedAt: e.submission.reviewedAt || null,
                    reviewedBy: e.submission.reviewedBy || null
                  });
                }
              }
            });
          }
        });
        setSubmissions(list);
      }
    } catch (fallbackErr) {
      setError(`Could not load ${isReelsMode ? 'reels' : 'poster'} submissions. Please ensure backend is online.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSubmissions();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const cleanPasskey = passkey.trim();

    // STRICT PASSKEY CHECK against expected passkey for the current mode
    if (cleanPasskey !== expectedPasskey) {
      setAuthLoading(false);
      setAuthError('Invalid Reviewer Passkey. Access Denied.');
      return;
    }

    try {
      const { data } = await apiFetch('/reviewer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey: cleanPasskey, mode: isReelsMode ? 'reels' : 'poster' })
      });

      if (data && data.success) {
        localStorage.setItem(tokenStorageKey, data.token || `REV_${Date.now()}_KEY`);
        setIsAuthenticated(true);
        setAuthLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Backend reviewer-login fallback to client auth:', err.message);
    } finally {
      setAuthLoading(false);
    }

    if (cleanPasskey === expectedPasskey) {
      localStorage.setItem(tokenStorageKey, `REV_${Date.now()}_KEY`);
      setIsAuthenticated(true);
    } else {
      setAuthError('Invalid Reviewer Passkey. Access Denied.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(tokenStorageKey);
    setIsAuthenticated(false);
  };

  const handleReviewStatus = async (item, newStatus, reason = '') => {
    setActionLoading(true);
    let success = false;

    const reviewPayload = {
      ...item.submission,
      reviewStatus: newStatus,
      rejectionReason: newStatus === 'REJECTED' ? reason.trim() : '',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerPanelName
    };

    // 1. Try dedicated endpoint first
    try {
      const { data } = await apiFetch('/review-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentAiId: item.studentAiId,
          eventId: item.eventId,
          eventTitle: item.eventTitle,
          status: newStatus,
          rejectionReason: reason,
          reviewerName: reviewerPanelName
        })
      });

      if (data && data.success) {
        success = true;
      }
    } catch (err) {
      console.warn('Fallback to /submit-event-content for review update:', err.message);
    }

    // 2. Fallback: call /submit-event-content
    if (!success) {
      try {
        const { data: submitData } = await apiFetch('/submit-event-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: item.studentAiId || item.studentRegNo,
            eventId: item.eventId,
            eventTitle: item.eventTitle,
            submission: reviewPayload
          })
        });
        if (submitData && submitData.success) {
          success = true;
        }
      } catch (e) {
        console.error('Review update error:', e);
      }
    }

    // Update local state
    setSubmissions(prev =>
      prev.map(s => {
        if (s.submissionId === item.submissionId || (s.studentAiId === item.studentAiId && s.eventId === item.eventId)) {
          return {
            ...s,
            reviewStatus: newStatus,
            rejectionReason: newStatus === 'REJECTED' ? reason : '',
            reviewedAt: new Date().toISOString()
          };
        }
        return s;
      })
    );
    setRejectingItem(null);
    setRejectionReason('');
    setActionLoading(false);
  };

  // Filter Submissions
  const filteredSubmissions = submissions.filter(s => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && (s.reviewStatus === 'PENDING' || !s.reviewStatus)) ||
      s.reviewStatus === statusFilter;

    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (s.studentName && s.studentName.toLowerCase().includes(term)) ||
      (s.studentAiId && s.studentAiId.toLowerCase().includes(term)) ||
      (s.studentRegNo && s.studentRegNo.toLowerCase().includes(term)) ||
      (s.teamName && s.teamName.toLowerCase().includes(term)) ||
      (s.eventTitle && s.eventTitle.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  const counts = {
    total: submissions.length,
    pending: submissions.filter(s => !s.reviewStatus || s.reviewStatus === 'PENDING').length,
    approved: submissions.filter(s => s.reviewStatus === 'APPROVED').length,
    rejected: submissions.filter(s => s.reviewStatus === 'REJECTED').length,
    resubmit: submissions.filter(s => s.reviewStatus === 'RESUBMIT_ALLOWED').length
  };

  const presets = isReelsMode ? [
    'Google Drive video link permission is private. Please set access to "Anyone with the link".',
    'Video length is not within the required 30-60 seconds duration.',
    'Video content does not align with the theme "AI for Society".',
    'Video file is corrupted, unplayable, or incomplete.',
    'Reel contains copyright violations or inappropriate content.'
  ] : [
    'Missing required methodology diagram or architecture overview.',
    'Poster resolution is low or text size is unreadable.',
    'Poster formatting does not adhere to A1 size guidelines.',
    'Google Drive link permission is private. Please set access to "Anyone with the link".'
  ];

  // 1. REVIEWER LOGIN PORTAL
  if (!isAuthenticated) {
    return (
      <div className="registration-container fade-in" style={{ padding: '3rem 1rem', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '1rem',
            borderRadius: '16px',
            background: isReelsMode ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #00f2fe, #4facfe)',
            color: '#0b1120',
            marginBottom: '1rem'
          }}>
            {isReelsMode ? <Video size={36} /> : <Shield size={36} />}
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', margin: '0 0 0.5rem 0' }}>
            {isReelsMode ? 'REELS COMPETITION REVIEWER LOGIN' : 'POSTER & PAPER REVIEWER LOGIN'}
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', margin: 0 }}>
            {isReelsMode
              ? 'Authorized portal for judges to inspect, evaluate, and approve or reject student reel submissions.'
              : 'Authorized portal for judges to inspect, evaluate, and approve or reject student paper/poster submissions.'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="form-card" style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '2rem', borderRadius: '16px', border: `1px solid ${isReelsMode ? 'rgba(245, 158, 11, 0.4)' : 'rgba(0, 242, 254, 0.3)'}` }}>
          {authError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} /> {authError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'block' }}>
              {isReelsMode ? 'ENTER REELS REVIEWER PASSKEY *' : 'ENTER POSTER REVIEWER PASSKEY *'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-control"
                placeholder="Enter Passkey"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                required
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.5rem', borderRadius: '10px', fontSize: '1rem', color: '#ffffff', WebkitTextFillColor: '#ffffff', background: 'rgba(15, 23, 42, 0.9)', border: `1px solid ${isReelsMode ? 'rgba(245, 158, 11, 0.5)' : 'rgba(0, 242, 254, 0.4)'}` }}
              />
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: isReelsMode ? '#f59e0b' : 'var(--primary-cyan)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={authLoading}
            style={{ width: '100%', padding: '0.95rem', fontWeight: '800', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: isReelsMode ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : undefined }}
          >
            {authLoading ? 'AUTHENTICATING...' : <>ACCESS REVIEWER PANEL <Sparkles size={18} /></>}
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{ width: '100%', marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.88rem' }}
            >
              ← Back to Main Events
            </button>
          )}
        </form>
      </div>
    );
  }

  // 2. MAIN DASHBOARD FOR REVIEWER
  return (
    <div className="registration-container fade-in" style={{ padding: '1.5rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', margin: 0, background: isReelsMode ? 'linear-gradient(135deg, #ffffff, #f59e0b)' : 'linear-gradient(135deg, #ffffff, #00f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {isReelsMode ? <Video size={28} style={{ color: '#f59e0b' }} /> : <FileText size={28} style={{ color: '#00f2fe' }} />}
            {isReelsMode ? 'REELS COMPETITION REVIEW PANEL' : 'POSTER & PAPER REVIEW PANEL'}
          </h1>
          <p style={{ color: 'var(--text-dim)', margin: '0.25rem 0 0 0', fontSize: '0.92rem' }}>
            {isReelsMode
              ? 'Evaluate received video reel submissions, approve accepted entries, or provide rejections with explanations.'
              : 'Evaluate received poster & paper submissions, approve accepted entries, or provide rejections with explanations.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchSubmissions}
            className="btn btn-secondary"
            disabled={loading}
            style={{ fontSize: '0.88rem', padding: '0.6rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '0.6rem 1rem', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.25rem', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>TOTAL SUBMISSIONS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ffffff' }}>{counts.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING')}
          style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '1.25rem', borderRadius: '14px', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fbbf24', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={16} /> PENDING REVIEW
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fbbf24' }}>{counts.pending}</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '1.25rem', borderRadius: '14px', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#4ade80', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={16} /> APPROVED
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#4ade80' }}>{counts.approved}</div>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1.25rem', borderRadius: '14px', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#f87171', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <XCircle size={16} /> REJECTED
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#f87171' }}>{counts.rejected}</div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem', background: 'rgba(15, 23, 42, 0.6)', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                background: statusFilter === f ? (isReelsMode ? '#f59e0b' : 'var(--primary-cyan)') : 'rgba(255, 255, 255, 0.05)',
                color: statusFilter === f ? '#0b1120' : '#ffffff',
                transition: 'all 0.2s ease'
              }}
            >
              {f === 'PENDING' ? 'PENDING REVIEW' : f}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search student, AI ID, event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.2rem', fontSize: '0.88rem', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.9)', color: '#ffffff', WebkitTextFillColor: '#ffffff', border: `1px solid ${isReelsMode ? 'rgba(245, 158, 11, 0.4)' : 'rgba(0, 242, 254, 0.3)'}` }}
          />
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        </div>
      </div>

      {/* SUBMISSIONS LIST GRID */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: isReelsMode ? '#f59e0b' : 'var(--primary-cyan)', fontSize: '1.1rem', fontWeight: '700' }}>
          Loading submissions for review...
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', border: '1px border-dashed rgba(255, 255, 255, 0.1)' }}>
          {isReelsMode ? <Video size={42} style={{ color: 'var(--text-dim)', marginBottom: '0.75rem' }} /> : <FileText size={42} style={{ color: 'var(--text-dim)', marginBottom: '0.75rem' }} />}
          <h3 style={{ color: '#ffffff', margin: '0 0 0.5rem 0' }}>No Submissions Found</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', margin: 0 }}>
            {searchTerm || statusFilter !== 'ALL'
              ? 'No submissions match your search/filter criteria.'
              : isReelsMode ? 'No reel submissions have been uploaded yet.' : 'No poster or paper submissions have been uploaded yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {filteredSubmissions.map((item) => {
            const sub = item.submission || {};
            const isApproved = item.reviewStatus === 'APPROVED';
            const isRejected = item.reviewStatus === 'REJECTED';
            const isResubmit = item.reviewStatus === 'RESUBMIT_ALLOWED';
            const fileUrl = sub.posterFile?.path ? getAssetUrl(sub.posterFile.path) : (sub.reelLink || sub.posterLink);

            return (
              <div
                key={item.submissionId}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: isApproved ? '1px solid rgba(34, 197, 94, 0.4)' : isResubmit ? '1px solid rgba(56, 189, 248, 0.4)' : isRejected ? '1px solid rgba(239, 68, 68, 0.4)' : `1px solid ${isReelsMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 242, 254, 0.3)'}`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
                }}
              >
                {/* Top Info Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', background: isReelsMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 242, 254, 0.15)', color: isReelsMode ? '#f59e0b' : '#00f2fe', padding: '0.2rem 0.6rem', borderRadius: '6px', border: `1px solid ${isReelsMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 242, 254, 0.3)'}` }}>
                        {item.eventTitle}
                      </span>
                      {item.teamName && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Users size={12} /> Team: {item.teamName}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                      {item.studentName} <span style={{ color: 'var(--primary-cyan)', fontSize: '1rem', fontFamily: 'monospace' }}>({item.studentAiId})</span>
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                      Reg No: <strong>{item.studentRegNo}</strong> • Year <strong>{item.studentYear}</strong> • Email: <strong>{item.studentEmail}</strong> {item.studentPhone && `• Phone: ${item.studentPhone}`}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isApproved ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34, 197, 94, 0.18)', color: '#4ade80', border: '1.5px solid #22c55e', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem' }}>
                        <CheckCircle2 size={16} /> APPROVED
                      </span>
                    ) : isResubmit ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', border: '1.5px solid #0284c7', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem' }}>
                        <RefreshCw size={16} /> RESUBMISSION ALLOWED
                      </span>
                    ) : isRejected ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: '1.5px solid #ef4444', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem' }}>
                        <XCircle size={16} /> REJECTED
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(251, 191, 36, 0.18)', color: '#fbbf24', border: '1.5px solid #f59e0b', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem' }}>
                        <Clock size={16} /> PENDING REVIEW
                      </span>
                    )}
                  </div>
                </div>

                {/* Submission Document / Poster / Reel File Details */}
                <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.2rem' }}>
                        SUBMITTED FILE / LINK:
                      </div>
                      <div style={{ fontSize: '0.92rem', color: '#ffffff', fontWeight: '600', wordBreak: 'break-all' }}>
                        {sub.reelLink || sub.posterLink || sub.posterFile?.fileName || 'Uploaded Document'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                        Submitted on: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>

                    {fileUrl && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <ExternalLink size={15} /> {isReelsMode ? 'View Reel Video' : 'View Poster / File'}
                      </a>
                    )}
                  </div>
                </div>

                {/* Display Rejection / Resubmission Reason */}
                {(isRejected || isResubmit) && item.rejectionReason && (
                  <div style={{ background: isResubmit ? 'rgba(56, 189, 248, 0.12)' : 'rgba(239, 68, 68, 0.12)', border: isResubmit ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', color: isResubmit ? '#38bdf8' : '#f87171', fontSize: '0.88rem' }}>
                    <strong>{isResubmit ? 'Resubmission Feedback to Student:' : 'Rejection Explanation to Student:'}</strong><br />
                    "{item.rejectionReason}"
                  </div>
                )}

                {/* Review Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    disabled={actionLoading || isApproved}
                    onClick={() => handleReviewStatus(item, 'APPROVED')}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: isApproved ? 'not-allowed' : 'pointer',
                      opacity: isApproved ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <CheckCircle2 size={16} /> {isReelsMode ? 'Approve Reel' : 'Approve Poster'}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading || isResubmit}
                    onClick={() => {
                      setResubmittingItem(item);
                      setResubmitReason(item.rejectionReason || '');
                    }}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: isResubmit ? 'not-allowed' : 'pointer',
                      opacity: isResubmit ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <RefreshCw size={16} /> Allow Resubmit
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading || isRejected}
                    onClick={() => {
                      setRejectingItem(item);
                      setRejectionReason(item.rejectionReason || '');
                    }}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: isRejected ? 'not-allowed' : 'pointer',
                      opacity: isRejected ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <XCircle size={16} /> {isReelsMode ? 'Reject Reel (Give Explanation)' : 'Reject Poster (Give Explanation)'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1.5px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '20px',
            padding: '2rem',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#f87171', marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <XCircle size={24} /> REJECT SUBMISSION & PROVIDE EXPLANATION
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Rejecting submission for <strong>{rejectingItem.studentName}</strong> ({rejectingItem.studentAiId}). The student will see this explanation and can resubmit their corrected entry.
            </p>

            {/* Template Presets */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>
                QUICK EXPLANATION PRESETS (CLICK TO USE):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    style={{
                      fontSize: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#e2e8f0',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Explanation Textarea */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.5rem', display: 'block' }}>
                EXPLANATION FOR REJECTION *
              </label>
              <textarea
                rows={4}
                className="form-control"
                placeholder={isReelsMode ? "Explain why the reel is rejected..." : "Explain why the poster is rejected..."}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', fontSize: '0.92rem', color: '#ffffff', WebkitTextFillColor: '#ffffff', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(239, 68, 68, 0.4)' }}
              />
            </div>

            {/* Modal Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRejectingItem(null)}
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading || !rejectionReason.trim()}
                onClick={() => handleReviewStatus(rejectingItem, 'REJECTED', rejectionReason)}
                style={{
                  padding: '0.65rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: !rejectionReason.trim() ? 'not-allowed' : 'pointer',
                  opacity: !rejectionReason.trim() ? 0.5 : 1
                }}
              >
                {actionLoading ? 'Saving...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALLOW RESUBMISSION MODAL */}
      {resubmittingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1.5px solid rgba(56, 189, 248, 0.5)',
            borderRadius: '20px',
            padding: '2rem',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#38bdf8', marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={24} /> ALLOW PARTICIPANT TO RESUBMIT
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Granting resubmission permission for <strong>{resubmittingItem.studentName}</strong> ({resubmittingItem.studentAiId}). The participant will be allowed to upload an updated version of their poster/paper file.
            </p>

            {/* Template Presets */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>
                QUICK INSTRUCTION PRESETS FOR STUDENT (CLICK TO USE):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setResubmitReason(preset)}
                    style={{
                      fontSize: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#e2e8f0',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions Textarea */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.5rem', display: 'block' }}>
                INSTRUCTIONS / REASON FOR RESUBMISSION REQUEST *
              </label>
              <textarea
                rows={4}
                className="form-control"
                placeholder="Explain what the student should fix or update before resubmitting..."
                value={resubmitReason}
                onChange={(e) => setResubmitReason(e.target.value)}
                style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', fontSize: '0.92rem', color: '#ffffff', WebkitTextFillColor: '#ffffff', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(56, 189, 248, 0.4)' }}
              />
            </div>

            {/* Modal Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResubmittingItem(null)}
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading || !resubmitReason.trim()}
                onClick={() => {
                  handleReviewStatus(resubmittingItem, 'RESUBMIT_ALLOWED', resubmitReason);
                  setResubmittingItem(null);
                }}
                style={{
                  padding: '0.65rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: !resubmitReason.trim() ? 'not-allowed' : 'pointer',
                  opacity: !resubmitReason.trim() ? 0.5 : 1
                }}
              >
                {actionLoading ? 'Saving...' : 'Confirm Allow Resubmit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
