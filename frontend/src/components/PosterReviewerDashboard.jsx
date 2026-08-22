import React, { useState, useEffect } from 'react';
import { Shield, Lock, FileText, CheckCircle2, XCircle, Clock, Search, RefreshCw, Filter, ExternalLink, MessageSquare, AlertTriangle, User, Users, Sparkles, ArrowLeft, LogOut, Download, Video, History, BookOpen, Image as ImageIcon } from 'lucide-react';
import { apiFetch, getAssetUrl, getUploadUrl } from '../config/api';

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
  // Resubmission History: keyed by submissionId
  const [resubHistoryMap, setResubHistoryMap] = useState({});
  const [expandedHistory, setExpandedHistory] = useState({});

  // Helper to extract previewable URL from any submission structure
  const getSubmissionFileUrl = (sub) => {
    if (!sub) return null;

    if (sub.posterLink && String(sub.posterLink).trim()) return String(sub.posterLink).trim();
    if (sub.reelLink && String(sub.reelLink).trim()) return String(sub.reelLink).trim();
    if (sub.paperLink && String(sub.paperLink).trim()) return String(sub.paperLink).trim();
    if (sub.driveLink && String(sub.driveLink).trim()) return String(sub.driveLink).trim();
    if (sub.fileUrl && String(sub.fileUrl).trim()) return String(sub.fileUrl).trim();

    if (sub.posterFile) {
      if (typeof sub.posterFile === 'string') {
        const p = sub.posterFile.trim();
        if (p.startsWith('data:') || p.startsWith('http://') || p.startsWith('https://')) return p;
        return getUploadUrl(p) || getAssetUrl(p);
      }
      const pathCandidate = sub.posterFile.serverUrl ||
                            sub.posterFile.savedDiskPath ||
                            sub.posterFile.filePath ||
                            sub.posterFile.path ||
                            sub.posterFile.url ||
                            sub.posterFile.fileData;
      if (pathCandidate && typeof pathCandidate === 'string' && pathCandidate.trim()) {
        const ft = pathCandidate.trim();
        if (ft.startsWith('data:') || ft.startsWith('http://') || ft.startsWith('https://')) return ft;
        return getUploadUrl(ft) || getAssetUrl(ft);
      }
    }

    if (sub.paperFile) {
      if (typeof sub.paperFile === 'string') {
        const p = sub.paperFile.trim();
        if (p.startsWith('data:') || p.startsWith('http://') || p.startsWith('https://')) return p;
        return getUploadUrl(p) || getAssetUrl(p);
      }
      const pathCandidate = sub.paperFile.serverUrl ||
                            sub.paperFile.savedDiskPath ||
                            sub.paperFile.filePath ||
                            sub.paperFile.path ||
                            sub.paperFile.url ||
                            sub.paperFile.fileData;
      if (pathCandidate && typeof pathCandidate === 'string' && pathCandidate.trim()) {
        const ft = pathCandidate.trim();
        if (ft.startsWith('data:') || ft.startsWith('http://') || ft.startsWith('https://')) return ft;
        return getUploadUrl(ft) || getAssetUrl(ft);
      }
    }

    return null;
  };

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
          const isResubmit = sub.reviewStatus === 'RESUBMIT_ALLOWED' || sub.allowResubmit || s.reviewStatus === 'RESUBMIT_ALLOWED' || (Array.isArray(sub.resubmissionHistory) && sub.resubmissionHistory.length > 0);
          if (isReelsMode) {
            return eId === 'creative-1' || title.includes('reel') || sub.submissionType === 'reel' || Boolean(sub.reelLink);
          } else {
            return (eId === 'technical-3' || title.includes('poster') || title.includes('paper') || sub.submissionType === 'paper' || sub.submissionType === 'poster' || isResubmit || Boolean(sub.posterFile || sub.posterLink || sub.paperFile || sub.paperLink || sub.fileUrl || sub.driveLink)) && !title.includes('reel');
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
              const sub = e.submission || {};
              const hasFilesOrLinks = Boolean(
                sub.posterFile || sub.posterLink || sub.reelLink || sub.paperFile || sub.paperLink || sub.fileUrl || sub.driveLink
              );
              const isResubmit = sub.reviewStatus === 'RESUBMIT_ALLOWED' || sub.allowResubmit || (Array.isArray(sub.resubmissionHistory) && sub.resubmissionHistory.length > 0);

              if (e.submission && (hasFilesOrLinks || isResubmit)) {
                const title = String(e.title || '').toLowerCase();
                const eId = String(e.id || '').toLowerCase();

                const isReel = eId === 'creative-1' || title.includes('reel') || sub.submissionType === 'reel' || Boolean(sub.reelLink);
                const isPoster = eId === 'technical-3' || title.includes('poster') || title.includes('paper') || sub.submissionType === 'paper' || sub.submissionType === 'poster' || isResubmit || Boolean(sub.posterFile || sub.posterLink || sub.paperFile || sub.paperLink || sub.fileUrl || sub.driveLink);

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

    const existingHistory = item.submission?.resubmissionHistory || resubHistoryMap[item.submissionId || `${item.studentAiId}_${item.eventId}`] || [];
    let updatedHistory = [...existingHistory];

    if (newStatus === 'RESUBMIT_ALLOWED' && item.submission) {
      const alreadySaved = updatedHistory.some(h => h.submittedAt === item.submission?.submittedAt && h.rejectionReason === reason.trim());
      if (!alreadySaved) {
        updatedHistory.push({
          submissionType: item.submission?.submissionType || (item.eventTitle?.toLowerCase().includes('paper') ? 'paper' : 'poster'),
          posterFile: item.submission?.posterFile,
          posterLink: item.submission?.posterLink,
          paperFile: item.submission?.paperFile,
          paperLink: item.submission?.paperLink,
          reelLink: item.submission?.reelLink,
          submittedAt: item.submission?.submittedAt || item.reviewedAt || new Date().toISOString(),
          rejectionReason: reason.trim(),
          allowedResubmitAt: new Date().toISOString()
        });
      }
    }

    const reviewPayload = {
      ...item.submission,
      reviewStatus: newStatus,
      rejectionReason: (newStatus === 'REJECTED' || newStatus === 'RESUBMIT_ALLOWED') ? reason.trim() : '',
      allowResubmit: newStatus === 'RESUBMIT_ALLOWED' || newStatus === 'REJECTED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerPanelName,
      resubmissionHistory: updatedHistory
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
          reviewerName: reviewerPanelName,
          resubmissionHistory: updatedHistory
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

    // Update local state ONLY on success
    if (success) {
      const historyKey = item.submissionId || `${item.studentAiId}_${item.eventId}`;
      setResubHistoryMap(prev => ({
        ...prev,
        [historyKey]: updatedHistory
      }));

      setSubmissions(prev =>
        prev.map(s => {
          if (s.submissionId === item.submissionId || (s.studentAiId === item.studentAiId && s.eventId === item.eventId)) {
            return {
              ...s,
              reviewStatus: newStatus,
              rejectionReason: (newStatus === 'REJECTED' || newStatus === 'RESUBMIT_ALLOWED') ? reason.trim() : '',
              allowResubmit: newStatus === 'RESUBMIT_ALLOWED' || newStatus === 'REJECTED',
              reviewedAt: new Date().toISOString(),
              submission: reviewPayload
            };
          }
          return s;
        })
      );
    } else {
      alert('Error: Failed to save review status on the server. Please verify database connection and try again.');
    }
    setRejectingItem(null);
    setRejectionReason('');
    setActionLoading(false);
  };

  // Filter Submissions
  const filteredSubmissions = submissions.filter(s => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && (s.reviewStatus === 'PENDING' || !s.reviewStatus)) ||
      (statusFilter === 'RESUBMIT' && (s.reviewStatus === 'RESUBMIT_ALLOWED' || (Array.isArray(s.submission?.resubmissionHistory) && s.submission.resubmissionHistory.length > 0))) ||
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

  // Categorize into 3 columns:
  const paperSubmissions = filteredSubmissions.filter(s =>
    s.submission?.submissionType === 'paper' && s.reviewStatus !== 'RESUBMIT_ALLOWED'
  );

  const posterSubmissions = filteredSubmissions.filter(s =>
    s.submission?.submissionType !== 'paper' && s.reviewStatus !== 'RESUBMIT_ALLOWED'
  );

  const resubmissionItems = filteredSubmissions.filter(s =>
    s.reviewStatus === 'RESUBMIT_ALLOWED' ||
    (Array.isArray(s.submission?.resubmissionHistory) && s.submission.resubmissionHistory.length > 0) ||
    (resubHistoryMap[s.submissionId || `${s.studentAiId}_${s.eventId}`]?.length > 0)
  );

  // Helper toggle for history accordion
  const toggleHistory = (id) => setExpandedHistory(prev => ({ ...prev, [id]: !prev[id] }));

  const counts = {
    total: submissions.length,
    pending: submissions.filter(s => !s.reviewStatus || s.reviewStatus === 'PENDING').length,
    approved: submissions.filter(s => s.reviewStatus === 'APPROVED').length,
    rejected: submissions.filter(s => s.reviewStatus === 'REJECTED').length,
    resubmit: submissions.filter(s => s.reviewStatus === 'RESUBMIT_ALLOWED' || (Array.isArray(s.submission?.resubmissionHistory) && s.submission.resubmissionHistory.length > 0) || (resubHistoryMap[s.submissionId || `${s.studentAiId}_${s.eventId}`]?.length > 0)).length
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

  // Renders a single submission card
  const renderSubmissionCard = (item, cardType) => {
    const sub = item.submission || {};
    const isApproved = item.reviewStatus === 'APPROVED';
    const isRejected = item.reviewStatus === 'REJECTED';
    const isResubmit = item.reviewStatus === 'RESUBMIT_ALLOWED';
    const fileUrl = getSubmissionFileUrl(sub);
    const historyKey = item.submissionId || `${item.studentAiId}_${item.eventId}`;
    const historyEntries = sub.resubmissionHistory || resubHistoryMap[historyKey] || [];
    const isPaper = cardType === 'paper';
    const accentColor = isReelsMode ? '#f59e0b' : isResubmit ? '#38bdf8' : isPaper ? '#c084fc' : '#00f2fe';
    const accentBorder = isReelsMode ? 'rgba(245,158,11,0.3)' : isResubmit ? 'rgba(56,189,248,0.4)' : isPaper ? 'rgba(168,85,247,0.3)' : 'rgba(0,242,254,0.3)';

    return (
      <div
        key={item.submissionId}
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          border: isApproved ? '1px solid rgba(34, 197, 94, 0.45)' : isRejected ? '1px solid rgba(239, 68, 68, 0.45)' : `1px solid ${accentBorder}`,
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Top Info Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', background: `rgba(${isPaper ? '168,85,247' : '0,242,254'},0.12)`, color: accentColor, padding: '0.18rem 0.55rem', borderRadius: '6px', border: `1px solid ${accentBorder}` }}>
                {item.eventTitle}
              </span>
              {item.teamName && (
                <span style={{ fontSize: '0.72rem', fontWeight: '800', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '0.18rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Users size={11} /> {item.teamName}
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ffffff', margin: '0 0 0.2rem 0', wordBreak: 'break-word' }}>
              {item.studentName} <span style={{ color: accentColor, fontSize: '0.88rem', fontFamily: 'monospace' }}>({item.studentAiId})</span>
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Reg: <strong>{item.studentRegNo}</strong> • Yr <strong>{item.studentYear}</strong> • <strong>{item.studentEmail}</strong>
            </div>
          </div>

          {/* Status Badge */}
          <div style={{ flexShrink: 0 }}>
            {isApproved ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(34,197,94,0.18)', color: '#4ade80', border: '1.5px solid #22c55e', padding: '0.35rem 0.7rem', borderRadius: '8px', fontWeight: '800', fontSize: '0.78rem' }}>
                <CheckCircle2 size={13} /> APPROVED
              </span>
            ) : isResubmit ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(56,189,248,0.18)', color: '#38bdf8', border: '1.5px solid #0284c7', padding: '0.35rem 0.7rem', borderRadius: '8px', fontWeight: '800', fontSize: '0.78rem' }}>
                <RefreshCw size={13} /> RESUBMISSION ALLOWED
              </span>
            ) : isRejected ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1.5px solid #ef4444', padding: '0.35rem 0.7rem', borderRadius: '8px', fontWeight: '800', fontSize: '0.78rem' }}>
                <XCircle size={13} /> REJECTED
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(251,191,36,0.18)', color: '#fbbf24', border: '1.5px solid #f59e0b', padding: '0.35rem 0.7rem', borderRadius: '8px', fontWeight: '800', fontSize: '0.78rem' }}>
                <Clock size={13} /> PENDING
              </span>
            )}
          </div>
        </div>

        {/* Submitted File */}
        <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '0.85rem', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ overflow: 'hidden', flex: '1 1 auto', minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.15rem' }}>
                SUBMITTED FILE / LINK:
              </div>
              <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600', wordBreak: 'break-all' }}>
                {sub.reelLink || sub.posterLink || sub.paperLink || sub.posterFile?.fileName || sub.paperFile?.fileName || (isResubmit ? 'Awaiting updated file' : 'Uploaded Document')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'N/A'}
              </div>
            </div>
            {fileUrl && (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: isPaper ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#ffffff', border: 'none', borderRadius: '8px', textDecoration: 'none', flexShrink: 0 }}>
                <ExternalLink size={13} /> Open File
              </a>
            )}
          </div>
        </div>

        {/* Rejection / Feedback reason */}
        {(isRejected || isResubmit) && item.rejectionReason && (
          <div style={{ background: isResubmit ? 'rgba(56, 189, 248, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: isResubmit ? '1px solid rgba(56,189,248,0.35)' : '1px solid rgba(239,68,68,0.35)', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '0.85rem', color: isResubmit ? '#38bdf8' : '#f87171', fontSize: '0.82rem' }}>
            <strong>{isResubmit ? 'Resubmission Feedback to Student:' : 'Rejection Reason:'}</strong> "{item.rejectionReason}"
            {isResubmit && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>⏳ Participant has been granted permission to resubmit.</div>}
          </div>
        )}

        {/* RESUBMISSION HISTORY accordion */}
        {historyEntries.length > 0 && (
          <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '10px', marginBottom: '0.85rem', overflow: 'hidden' }}>
            <button type="button"
              onClick={() => toggleHistory(historyKey)}
              style={{ width: '100%', background: 'none', border: 'none', padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#38bdf8', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <History size={13} />
                Resubmission History ({historyEntries.length})
              </span>
              <span>{expandedHistory[historyKey] ? '▲' : '▼'}</span>
            </button>
            {expandedHistory[historyKey] && (
              <div style={{ padding: '0 0.85rem 0.75rem', display: 'grid', gap: '0.5rem' }}>
                {historyEntries.map((entry, idx) => (
                  <div key={idx} style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: '800', color: '#7dd3fc' }}>
                        Submission #{idx + 1} — {entry.submissionType === 'paper' ? '📄 Paper' : '🖼 Poster'}
                      </span>
                      <span style={{ color: '#64748b' }}>{entry.submittedAt || entry.archivedAt ? new Date(entry.submittedAt || entry.archivedAt).toLocaleString() : ''}</span>
                    </div>
                    <div style={{ color: '#cbd5e1', wordBreak: 'break-all' }}>
                      {entry.posterFile?.fileName || entry.posterLink || entry.paperFile?.fileName || entry.paperLink || 'Uploaded File'}
                    </div>
                    {entry.rejectionReason && (
                      <div style={{ color: '#f87171', marginTop: '0.2rem' }}>❌ Feedback: "{entry.rejectionReason}"</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Review Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '0.85rem' }}>
          <button type="button" disabled={actionLoading || isApproved}
            onClick={() => handleReviewStatus(item, 'APPROVED')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', fontWeight: '800', fontSize: '0.78rem', cursor: isApproved ? 'not-allowed' : 'pointer', opacity: isApproved ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={13} /> Approve {isPaper ? 'Paper' : isReelsMode ? 'Reel' : 'Poster'}
          </button>

          <button type="button" disabled={actionLoading || isResubmit}
            onClick={() => { setResubmittingItem(item); setResubmitReason(item.rejectionReason || ''); }}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#ffffff', fontWeight: '800', fontSize: '0.78rem', cursor: isResubmit ? 'not-allowed' : 'pointer', opacity: isResubmit ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <RefreshCw size={13} /> Allow Resubmit
          </button>

          <button type="button" disabled={actionLoading || isRejected}
            onClick={() => { setRejectingItem(item); setRejectionReason(item.rejectionReason || ''); }}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ffffff', fontWeight: '800', fontSize: '0.78rem', cursor: isRejected ? 'not-allowed' : 'pointer', opacity: isRejected ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <XCircle size={13} /> Reject {isPaper ? 'Paper' : isReelsMode ? 'Reel' : 'Poster'}
          </button>
        </div>
      </div>
    );
  };

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

        <div
          onClick={() => setStatusFilter('RESUBMIT')}
          style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1.25rem', borderRadius: '14px', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#38bdf8', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <History size={16} /> RESUBMISSION HISTORY
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#38bdf8' }}>{counts.resubmit}</div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem', background: 'rgba(15, 23, 42, 0.6)', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'RESUBMIT'].map(f => (
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
              {f === 'PENDING' ? 'PENDING REVIEW' : f === 'RESUBMIT' ? 'RESUBMISSION HISTORY' : f}
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

      {/* SUBMISSIONS LIST — Three Column Layout for Paper, Poster, and Re-Submission History */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: isReelsMode ? '#f59e0b' : 'var(--primary-cyan)', fontSize: '1.1rem', fontWeight: '700' }}>
          Loading submissions for review...
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {isReelsMode ? <Video size={42} style={{ color: 'var(--text-dim)', marginBottom: '0.75rem' }} /> : <FileText size={42} style={{ color: 'var(--text-dim)', marginBottom: '0.75rem' }} />}
          <h3 style={{ color: '#ffffff', margin: '0 0 0.5rem 0' }}>No Submissions Found</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', margin: 0 }}>
            {searchTerm || statusFilter !== 'ALL'
              ? 'No submissions match your search/filter criteria.'
              : isReelsMode ? 'No reel submissions have been uploaded yet.' : 'No poster or paper submissions have been uploaded yet.'}
          </p>
        </div>
      ) : isReelsMode ? (
        /* REELS MODE: single column */
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {filteredSubmissions.map((item) => renderSubmissionCard(item, 'reel'))}
        </div>
      ) : (
        /* POSTER MODE: Three columns — Papers | Posters | Re-Submission History */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
          {/* COLUMN 1: RESEARCH PAPERS */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              marginBottom: '1rem', paddingBottom: '0.75rem',
              borderBottom: '2px solid rgba(168,85,247,0.4)'
            }}>
              <BookOpen size={20} color="#c084fc" />
              <span style={{ fontWeight: '800', fontSize: '1rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Research Papers
              </span>
              <span style={{
                background: 'rgba(168,85,247,0.2)', color: '#c084fc',
                border: '1px solid rgba(168,85,247,0.4)',
                borderRadius: '20px', padding: '0.15rem 0.6rem',
                fontSize: '0.78rem', fontWeight: '800'
              }}>{paperSubmissions.length}</span>
            </div>
            {paperSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(168,85,247,0.05)', borderRadius: '14px', border: '1px dashed rgba(168,85,247,0.25)' }}>
                <BookOpen size={32} style={{ color: 'rgba(168,85,247,0.4)', marginBottom: '0.5rem' }} />
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>No paper submissions</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.1rem' }}>
                {paperSubmissions.map(item => renderSubmissionCard(item, 'paper'))}
              </div>
            )}
          </div>

          {/* COLUMN 2: POSTERS */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              marginBottom: '1rem', paddingBottom: '0.75rem',
              borderBottom: '2px solid rgba(0,242,254,0.4)'
            }}>
              <ImageIcon size={20} color="#00f2fe" />
              <span style={{ fontWeight: '800', fontSize: '1rem', color: '#00f2fe', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Posters
              </span>
              <span style={{
                background: 'rgba(0,242,254,0.15)', color: '#00f2fe',
                border: '1px solid rgba(0,242,254,0.4)',
                borderRadius: '20px', padding: '0.15rem 0.6rem',
                fontSize: '0.78rem', fontWeight: '800'
              }}>{posterSubmissions.length}</span>
            </div>
            {posterSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(0,242,254,0.04)', borderRadius: '14px', border: '1px dashed rgba(0,242,254,0.2)' }}>
                <ImageIcon size={32} style={{ color: 'rgba(0,242,254,0.4)', marginBottom: '0.5rem' }} />
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>No poster submissions</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.1rem' }}>
                {posterSubmissions.map(item => renderSubmissionCard(item, 'poster'))}
              </div>
            )}
          </div>

          {/* COLUMN 3: RE-SUBMISSION HISTORY */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              marginBottom: '1rem', paddingBottom: '0.75rem',
              borderBottom: '2px solid rgba(56,189,248,0.4)'
            }}>
              <History size={20} color="#38bdf8" />
              <span style={{ fontWeight: '800', fontSize: '1rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Re-Submission History
              </span>
              <span style={{
                background: 'rgba(56,189,248,0.15)', color: '#38bdf8',
                border: '1px solid rgba(56,189,248,0.4)',
                borderRadius: '20px', padding: '0.15rem 0.6rem',
                fontSize: '0.78rem', fontWeight: '800'
              }}>{resubmissionItems.length}</span>
            </div>
            {resubmissionItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(56,189,248,0.04)', borderRadius: '14px', border: '1px dashed rgba(56,189,248,0.2)' }}>
                <History size={32} style={{ color: 'rgba(56,189,248,0.4)', marginBottom: '0.5rem' }} />
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>No resubmission history yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.1rem' }}>
                {resubmissionItems.map(item => renderSubmissionCard(item, 'resubmit'))}
              </div>
            )}
          </div>
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
