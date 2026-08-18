import React, { useState, useEffect, useCallback } from 'react';
import { X, Video, FileText, Upload, CheckCircle2, AlertCircle, Link as LinkIcon, ExternalLink, Trash2, ShieldCheck } from 'lucide-react';
import { isSameEvent } from '../data/eventsRulesData';
import { apiFetch, getUploadUrl } from '../config/api';

export default function SubmissionModal({ isOpen, onClose, event, currentUser, onSubmitSuccess }) {
  const [reelLink, setReelLink] = useState('');
  const [posterLink, setPosterLink] = useState('');
  const [fileObj, setFileObj] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Compute event type BEFORE early return (will be '' if event is null)
  const eventTitleStr = String(event?.title || '').toLowerCase();
  const eventIdStr = String(event?.id || '').toLowerCase();
  const isReels = eventIdStr.includes('creative-1') || eventTitleStr.includes('reel');
  const isPoster = !isReels;

  const matchedEvent = currentUser?.registeredEvents?.find(e => isSameEvent(event, e));

  // Non-leader team member check: applies to BOTH Reels and Poster/Paper events
  // If the user is in a team (isTeam=true) but is NOT the leader (isLeader=false), they cannot submit
  const isNonLeaderBlocked = matchedEvent?.isTeam === true && matchedEvent?.isLeader === false;

  const hasSubmitted = !!(matchedEvent?.submission && (
    matchedEvent.submission.reelLink ||
    matchedEvent.submission.posterFile ||
    matchedEvent.submission.posterLink
  ));

  const isResubmitAllowed = Boolean(
    matchedEvent?.submission?.reviewStatus === 'RESUBMIT_ALLOWED' ||
    matchedEvent?.submission?.reviewStatus === 'REJECTED' ||
    matchedEvent?.submission?.allowResubmit
  );

  // ALL hooks must be unconditionally called — no early returns before this
  useEffect(() => {
    if (!isOpen || !event) return;
    if (currentUser && Array.isArray(currentUser.registeredEvents)) {
      const match = currentUser.registeredEvents.find(e => isSameEvent(event, e));

      if (match && match.submission) {
        if (match.submission.reelLink) setReelLink(match.submission.reelLink);
        if (match.submission.posterLink) setPosterLink(match.submission.posterLink);
        const isResubmitReq = match.submission.reviewStatus === 'RESUBMIT_ALLOWED' || match.submission.reviewStatus === 'REJECTED' || match.submission.allowResubmit;
        if (match.submission.posterFile && !isResubmitReq) {
          setFileObj(match.submission.posterFile);
        } else {
          setFileObj(null);
        }
      }
    }
    // Reset errors when reopening
    setErrorMsg('');
    setSuccessMsg('');
  }, [isOpen, event?.id, event?.title, currentUser]);

  // Handle File selection (PDF ONLY, Max 10MB)
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      setErrorMsg('Invalid file format: Only PDF files (.pdf) are allowed for poster/paper submission.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10MB limit. Please upload a PDF file under 10MB.');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      setFileObj({
        fileName: file.name,
        fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        fileType: 'application/pdf',
        fileData: reader.result
      });
    };
    reader.onerror = () => setErrorMsg('Failed to read the PDF file. Please try again.');
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isReels) {
      if (!reelLink || !reelLink.trim()) { setErrorMsg('Please enter your Public Google Drive video link.'); return; }
      const trimmedLink = reelLink.trim().toLowerCase();
      if (!trimmedLink.startsWith('http://') && !trimmedLink.startsWith('https://')) {
        setErrorMsg('Please enter a valid URL starting with http:// or https://'); return;
      }
      if (trimmedLink.includes('instagram.com') || trimmedLink.includes('insta.com')) {
        setErrorMsg('Instagram reels are NOT allowed. Please upload your video to Google Drive, set access permission to "Anyone with the link (Public)", and submit the Google Drive link.');
        return;
      }
      if (!trimmedLink.includes('drive.google.com') && !trimmedLink.includes('docs.google.com') && !trimmedLink.includes('google.com') && !trimmedLink.includes('cloud')) {
        setErrorMsg('Please submit a Public Google Drive video link (e.g., https://drive.google.com/file/d/...).');
        return;
      }
    }

    if (isPoster) {
      if (!fileObj && (!posterLink || !posterLink.trim())) {
        setErrorMsg('Please upload your poster/paper file or provide a Google Drive / file link.'); return;
      }
      if (posterLink && posterLink.trim() && !posterLink.trim().startsWith('http://') && !posterLink.trim().startsWith('https://')) {
        setErrorMsg('File link must start with http:// or https://'); return;
      }
    }

    setSubmitting(true);
    try {
      const submissionPayload = {
        type: isReels ? 'reels' : 'poster',
        reelLink: isReels ? reelLink.trim() : undefined,
        posterFile: isPoster ? fileObj : undefined,
        posterLink: isPoster ? posterLink.trim() : undefined
      };
      const identifier = currentUser?.aiId || currentUser?.regNo || currentUser?.email;
      const { res, data } = await apiFetch('/submit-event-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, eventId: event?.id, eventTitle: event?.title, submission: submissionPayload })
      });
      if (data.success) {
        setSuccessMsg(isReels ? 'Reel link submitted successfully!' : 'Poster/paper submission saved successfully!');

        // Build patched registeredEvents — use backend response if available,
        // otherwise patch current user's events directly so button updates immediately
        if (onSubmitSuccess) {
          let updatedEvents = data.registeredEvents;
          if (!Array.isArray(updatedEvents) || updatedEvents.length === 0) {
            // Fallback: patch locally
            const prevEvents = currentUser?.registeredEvents || [];
            const submissionPayloadLocal = {
              type: isReels ? 'reels' : 'poster',
              reelLink: isReels ? reelLink.trim() : undefined,
              posterFile: isPoster ? fileObj : undefined,
              posterLink: isPoster ? posterLink.trim() : undefined,
              submittedAt: new Date().toISOString()
            };
            const cleanT = String(event?.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const patchedIdx = prevEvents.findIndex(e => {
              const eT = String(e.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              return cleanT && eT && (cleanT.includes(eT) || eT.includes(cleanT));
            });
            if (patchedIdx !== -1) {
              updatedEvents = prevEvents.map((e, i) =>
                i === patchedIdx ? { ...e, submission: submissionPayloadLocal } : e
              );
            }
          }
          onSubmitSuccess(updatedEvents);
        }
        setTimeout(() => onClose(), 1500);
      } else {
        setErrorMsg(data.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Server connection error during submission.');
    } finally {
      setSubmitting(false);
    }
  }, [isReels, isPoster, reelLink, posterLink, fileObj, currentUser, event, onSubmitSuccess, onClose]);

  // NOW the early return — after all hooks
  if (!isOpen || !event) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '0.75rem 0.5rem',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}
    >
      <div style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))',
        border: isReels ? '1.5px solid rgba(251, 191, 36, 0.5)' : '1.5px solid rgba(0, 240, 255, 0.5)',
        borderRadius: '20px',
        padding: '1.25rem 1.5rem',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: isReels ? '0 0 30px rgba(251, 191, 36, 0.25)' : '0 0 30px rgba(0, 240, 255, 0.25)',
        position: 'relative',
        animation: 'fadeIn 0.25s ease-out',
        boxSizing: 'border-box'
      }}>


        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          style={{
            position: 'absolute',
            top: '1.2rem',
            right: '1.2rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#94a3b8',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: isReels ? 'rgba(251, 191, 36, 0.15)' : 'rgba(0, 240, 255, 0.15)',
            border: isReels ? '1px solid #fbbf24' : '1px solid #00f0ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {isReels ? <Video size={24} color="#fbbf24" /> : <FileText size={24} color="#00f0ff" />}
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: isReels ? '#fbbf24' : '#00f0ff' }}>
              {isReels ? 'REELS SUBMISSION PORTAL' : 'PAPER / POSTER SUBMISSION PORTAL'}
            </span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
              {event.title}
            </h2>
          </div>
        </div>
        {hasSubmitted && (
          <div style={{
            background: matchedEvent?.submission?.reviewStatus === 'APPROVED'
              ? 'rgba(34, 197, 94, 0.15)'
              : matchedEvent?.submission?.reviewStatus === 'REJECTED'
              ? 'rgba(239, 68, 68, 0.15)'
              : 'rgba(251, 191, 36, 0.15)',
            border: matchedEvent?.submission?.reviewStatus === 'APPROVED'
              ? '1.5px solid #22c55e'
              : matchedEvent?.submission?.reviewStatus === 'REJECTED'
              ? '1.5px solid #ef4444'
              : '1.5px solid #f59e0b',
            color: matchedEvent?.submission?.reviewStatus === 'APPROVED'
              ? '#4ade80'
              : matchedEvent?.submission?.reviewStatus === 'REJECTED'
              ? '#f87171'
              : '#fbbf24',
            padding: '1rem 1.15rem',
            borderRadius: '12px',
            fontSize: '0.88rem',
            lineHeight: '1.4',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', width: '100%' }}>
              {matchedEvent?.submission?.reviewStatus === 'APPROVED' ? (
                <CheckCircle2 size={22} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              ) : matchedEvent?.submission?.reviewStatus === 'REJECTED' ? (
                <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              ) : (
                <ShieldCheck size={22} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              )}
              <div style={{ flex: '1 1 auto' }}>
                <div style={{ fontWeight: '800', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  {matchedEvent?.submission?.reviewStatus === 'APPROVED'
                    ? '✅ POSTER / PAPER APPROVED BY REVIEW PANEL'
                    : matchedEvent?.submission?.reviewStatus === 'RESUBMIT_ALLOWED'
                    ? '🔄 RESUBMISSION ALLOWED BY REVIEW PANEL'
                    : matchedEvent?.submission?.reviewStatus === 'REJECTED'
                    ? '❌ SUBMISSION REJECTED BY REVIEW PANEL'
                    : '⏳ PENDING REVIEW BY JUDGES'}
                </div>
                {(matchedEvent?.submission?.reviewStatus === 'REJECTED' || matchedEvent?.submission?.reviewStatus === 'RESUBMIT_ALLOWED') && matchedEvent.submission.rejectionReason && (
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.6rem 0.75rem', borderRadius: '8px', marginTop: '0.4rem', color: '#ffffff', fontSize: '0.85rem', border: matchedEvent.submission.reviewStatus === 'RESUBMIT_ALLOWED' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)' }}>
                    <strong>{matchedEvent.submission.reviewStatus === 'RESUBMIT_ALLOWED' ? 'Reviewer Feedback:' : 'Rejection Reason:'}</strong> "{matchedEvent.submission.rejectionReason}"<br />
                    <span style={{ fontSize: '0.78rem', color: matchedEvent.submission.reviewStatus === 'RESUBMIT_ALLOWED' ? '#7dd3fc' : '#fca5a5' }}>Please select your updated PDF file below and click "Update & Resubmit Poster".</span>
                  </div>
                )}
                {matchedEvent?.submission?.submittedBy && (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.25rem' }}>
                    Submitted by: {matchedEvent.submission.submittedBy.name} ({matchedEvent.submission.submittedBy.aiId}) 
                    {matchedEvent.submission.submittedAt && ` on ${new Date(matchedEvent.submission.submittedAt).toLocaleString()}`}
                  </div>
                )}
              </div>
            </div>
            {reelLink && (reelLink.startsWith('http://') || reelLink.startsWith('https://')) && (
              <a
                href={reelLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  textDecoration: 'none',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                }}
              >
                <ExternalLink size={16} /> Preview Reel
              </a>
            )}
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(248, 113, 113, 0.4)',
            color: '#f87171',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            color: '#34d399',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* NON-LEADER TEAM MEMBER — blocked from submitting (Reels & Poster) */}
        {isNonLeaderBlocked && (
          <div style={{
            background: isReels ? 'rgba(251, 191, 36, 0.08)' : 'rgba(0, 240, 255, 0.08)',
            border: isReels ? '1.5px solid rgba(251, 191, 36, 0.5)' : '1.5px solid rgba(0, 240, 255, 0.5)',
            borderRadius: '14px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
            <div style={{ fontWeight: '800', color: isReels ? '#fbbf24' : '#00f0ff', fontSize: '1rem', marginBottom: '0.5rem' }}>
              Submission Restricted to Team Leader Only
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.6' }}>
              Your team <strong style={{ color: isReels ? '#fbbf24' : '#00f0ff' }}>{matchedEvent?.teamName || 'your team'}</strong> is registered for this event.<br />
              Only the <strong>Team Leader</strong> can {isReels ? 'submit the Google Drive reel link' : 'upload the poster/paper file'} on behalf of the team.<br />
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Please ask your Team Leader to submit.</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: isNonLeaderBlocked ? 'none' : 'block' }}>
          {/* REELS COMPETITION INPUT / PREVIEW */}
          {isReels && (
            <div style={{ marginBottom: '1.5rem' }}>
              {!hasSubmitted ? (
                <>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>
                    Public Google Drive Reel Video Link: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/file/d/... (Public Link)"
                      value={reelLink}
                      onChange={(e) => setReelLink(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.6rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(251, 191, 36, 0.4)',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <LinkIcon size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#fbbf24' }} />
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.5rem', lineHeight: '1.4' }}>
                    📌 <strong>Requirement:</strong> Upload your reel video to <strong>Google Drive</strong>, set General Access to <strong>"Anyone with the link (Public)"</strong>, and paste the link here. <em>(Instagram links are not accepted)</em>.
                  </p>
                </>
              ) : (
                <div style={{
                  background: 'rgba(251, 191, 36, 0.08)',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                    <Video size={24} color="#fbbf24" style={{ flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                        Submitted Google Drive Reel Link
                      </div>
                      <div style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '700', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {reelLink || 'Google Drive reel link submitted'}
                      </div>
                    </div>
                  </div>

                  {reelLink && (
                    <a
                      href={reelLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.55rem 1.1rem',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        fontWeight: '700',
                        textDecoration: 'none',
                        boxShadow: '0 2px 12px rgba(245, 158, 11, 0.3)'
                      }}
                    >
                      <ExternalLink size={16} /> Open & Preview Reel
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* POSTER / PAPER PRESENTATION INPUT / PREVIEW */}
          {isPoster && (
            <div style={{ marginBottom: '1.5rem' }}>
              {(!hasSubmitted || isResubmitAllowed) ? (
                <>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>
                    Upload Poster or Paper PDF File (.pdf only, max 10MB):
                  </label>

                  {/* Upload Drop Area */}
                  <div
                    style={{
                      border: '2px dashed rgba(0, 240, 255, 0.4)',
                      borderRadius: '12px',
                      padding: '1.5rem 1rem',
                      textAlign: 'center',
                      background: 'rgba(15, 23, 42, 0.6)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onClick={() => document.getElementById('poster-file-input')?.click()}
                  >
                    <input
                      id="poster-file-input"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <Upload size={32} color="#00f0ff" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={{ color: '#f8fafc', fontSize: '0.9rem', fontWeight: '600', margin: '0 0 0.25rem 0' }}>
                      Click to select PDF poster/paper file
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: 0 }}>
                      Supports PDF files only (Max 10MB)
                    </p>
                  </div>

                  {isResubmitAllowed && matchedEvent?.submission?.posterFile?.fileName && !fileObj && (
                    <p style={{ color: '#38bdf8', fontSize: '0.78rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                      ℹ️ <strong>Previously uploaded file:</strong> <em>{matchedEvent.submission.posterFile.fileName}</em>. Selecting a new PDF file above will replace it.
                    </p>
                  )}

                  {fileObj && (
                    <div style={{
                      marginTop: '0.85rem',
                      padding: '0.75rem 1rem',
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                        <FileText size={20} color="#00f0ff" style={{ flexShrink: 0 }} />
                        <div style={{ overflow: 'hidden' }}>
                          <p style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {fileObj.fileName}
                          </p>
                          {fileObj.fileSize && (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{fileObj.fileSize}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFileObj(null);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '0.2rem'
                        }}
                        title="Remove selected file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}

                  {/* Alternative Document URL Input */}
                  <div style={{ marginTop: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
                      Or Google Drive / Cloud Presentation Link (Optional):
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/file/d/..."
                        value={posterLink}
                        onChange={(e) => setPosterLink(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 1rem 0.6rem 2.4rem',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <LinkIcon size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#00f0ff' }} />
                    </div>
                  </div>
                </>
              ) : (
                /* READ-ONLY PREVIEW MODE FOR POSTER / PAPER */
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  {(() => {
                    const activeFile = fileObj || matchedEvent?.submission?.posterFile;
                    if (!activeFile) return null;
                    const src = activeFile.fileData || getUploadUrl(activeFile.serverUrl) || activeFile.savedDiskPath;

                    return (
                      <div style={{
                        background: 'rgba(0, 240, 255, 0.06)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '14px',
                        padding: '1.25rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <FileText size={22} color="#00f0ff" />
                            <div>
                              <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '0.95rem' }}>
                                {activeFile.fileName || 'Submitted Poster / Paper (.pdf)'}
                              </div>
                              {activeFile.fileSize && (
                                <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{activeFile.fileSize}</span>
                              )}
                            </div>
                          </div>

                          {src && (
                            <a
                              href={src}
                              target="_blank"
                              download={activeFile.fileName || 'submitted_poster.pdf'}
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #00f0ff, #0072ff)',
                                color: '#ffffff',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                textDecoration: 'none',
                                boxShadow: '0 2px 12px rgba(0, 240, 255, 0.3)'
                              }}
                            >
                              <ExternalLink size={15} /> Open / Download PDF
                            </a>
                          )}
                        </div>

                        {/* Interactive PDF Document Preview */}
                        {src && (
                          <div style={{ textAlign: 'center', marginTop: '0.8rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(0, 240, 255, 0.25)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.6rem', color: '#38bdf8', fontSize: '0.85rem', fontWeight: '600' }}>
                              <FileText size={16} /> PDF Document Preview Loaded
                            </div>
                            <iframe
                              src={src}
                              title="Submitted PDF Document Preview"
                              style={{ width: '100%', height: '280px', borderRadius: '8px', border: 'none', background: '#ffffff' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {posterLink && (
                    <div style={{
                      background: 'rgba(0, 240, 255, 0.06)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '14px',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                        <LinkIcon size={20} color="#00f0ff" style={{ flexShrink: 0 }} />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>
                            Cloud Presentation Link
                          </div>
                          <div style={{ color: '#ffffff', fontSize: '0.88rem', fontWeight: '700', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {posterLink}
                          </div>
                        </div>
                      </div>

                      <a
                        href={posterLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #00f0ff, #0072ff)',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          textDecoration: 'none',
                          boxShadow: '0 2px 12px rgba(0, 240, 255, 0.3)'
                        }}
                      >
                        <ExternalLink size={15} /> Preview Link
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit / Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            {(hasSubmitted && !isResubmitAllowed) ? (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.65rem 2rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Close View
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: isReels ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #00f0ff, #0072ff)',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: isReels ? '0 4px 15px rgba(245, 158, 11, 0.3)' : '0 4px 15px rgba(0, 240, 255, 0.3)',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Saving...' : (isResubmitAllowed ? 'Update & Resubmit Poster' : (isReels ? 'Submit Reel Link' : 'Submit Poster / Paper'))}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
