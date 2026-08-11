import React, { useState } from 'react';
import { ArrowLeft, Award, Phone, UserPlus, Sparkles, ShieldCheck, Calendar, Video, FileText, CheckCircle2, Bot, Zap, MessageCircle, ExternalLink, Lock } from 'lucide-react';
import SubmissionModal from './SubmissionModal';
import { isSameEvent, getEventDetails } from '../data/eventsRulesData';
import { getAssetUrl } from '../config/api';

export default function EventDetailsView({ event, onBack, onRegister, currentUser = null, onEnrollEvent, onSubmissionUpdate }) {
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  // Track freshly submitted data locally so button updates even before parent re-renders
  const [localSubmission, setLocalSubmission] = useState(null);

  if (!event) return null;

  const isEnrolled = currentUser?.registeredEvents?.some(e => isSameEvent(event, e));

  const isReels = event.id === 'creative-1' || (event.id === '1' && (event.categoryId === 'creative' || String(event.categoryId).toLowerCase() === 'creative')) || (event.title && event.title.toLowerCase().includes('reel'));
  const isPoster = event.id === 'technical-3' || (event.id === '3' && (event.categoryId === 'technical' || String(event.categoryId).toLowerCase() === 'technical')) || (event.title && (event.title.toLowerCase().includes('poster') || event.title.toLowerCase().includes('paper')));

  const matchedRegisteredEvent = currentUser?.registeredEvents?.find(e => isSameEvent(event, e));

  // Merge: use locally tracked submission data as fallback if parent hasn't re-rendered yet
  const existingSubmission = matchedRegisteredEvent?.submission || localSubmission;


  return (
    <div className="event-detail-page">
      <div className="event-detail-container">
        {/* PROMINENT STANDALONE BACK BUTTON BAR WITH TOP-RIGHT WHATSAPP BUTTON */}
        <div className="event-details-back-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '0.5rem' }}>
          <button className="back-to-events-btn" onClick={onBack} type="button">
            <ArrowLeft size={18} />
            <span>Back to Events</span>
          </button>

          {/* TOP-RIGHT WHATSAPP GROUP BUTTON */}
          {(() => {
            const groupLink = event.whatsappGroupLink || getEventDetails(event.categoryId, event.id, event.title)?.whatsappGroupLink || 'https://chat.whatsapp.com/YOUR_WHATSAPP_GROUP_LINK';
            
            if (isEnrolled) {
              return (
                <a
                  href={groupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-top-btn active"
                  title="Join official WhatsApp group for event updates & announcements"
                >
                  <MessageCircle size={18} />
                  <span>Join WhatsApp Group</span>
                  <ExternalLink size={14} style={{ opacity: 0.85 }} />
                </a>
              );
            }

            return (
              <button
                type="button"
                className="whatsapp-top-btn locked"
                onClick={() => {
                  alert(`🔒 Registration Required:\n\nPlease register for '${event.title}' first to unlock access to the official WhatsApp group!`);
                }}
                title="Register for this event to unlock the WhatsApp group link"
              >
                <Lock size={16} />
                <span>Join WhatsApp Group</span>
              </button>
            );
          })()}
        </div>

        {/* TOP HEADER WITH CENTERED HEADINGS */}
        <header className="event-detail-header-centered">
          <div className="event-title-center-group">
            <span className="event-category-label-centered">{event.categoryName || 'TECHNICAL EVENTS'}</span>
            <h1 className="event-heading-title-centered">{event.title}</h1>
          </div>
        </header>

        {/* 3-COLUMN CONTENT GRID */}
        <div className="event-detail-grid">
          {/* COLUMN 1: LEFT POSTER CARD */}
          <div className="event-card-column">
            <div className="event-poster-card">
              <img
                src={getAssetUrl(event.image || '/images/event_hackathon_1786084020517.png')}
                alt={event.title}
                className="event-poster-image"
              />
            </div>
            {/* Quick Register / Submission Button Place */}
            {!currentUser ? (
              <button
                className="card-quick-register-btn"
                onClick={() => onRegister && onRegister(event)}
              >
                <Sparkles size={18} />
                <span>Register For Event</span>
              </button>
            ) : !isEnrolled ? (
              <button
                className="card-quick-register-btn"
                onClick={() => onEnrollEvent && onEnrollEvent(event)}
              >
                <Sparkles size={18} />
                <span>Register for this Event</span>
              </button>
            ) : isReels ? (
              <button
                className="card-quick-register-btn"
                style={{
                  background: existingSubmission?.reelLink
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  borderColor: '#fbbf24'
                }}
                onClick={() => setIsSubmissionModalOpen(true)}
              >
                <Video size={18} />
                <span>{existingSubmission?.reelLink ? 'Reel Submitted (Preview)' : 'Submit Reel Link'}</span>
              </button>
            ) : isPoster ? (
              <button
                className={`card-quick-register-btn ${(existingSubmission?.posterFile || existingSubmission?.posterLink) ? '' : 'poster-upload-btn-blinking'}`}
                style={{
                  background: (existingSubmission?.posterFile || existingSubmission?.posterLink)
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : undefined,
                  borderColor: (existingSubmission?.posterFile || existingSubmission?.posterLink)
                    ? '#10b981'
                    : undefined
                }}
                onClick={() => setIsSubmissionModalOpen(true)}
              >
                <FileText size={18} />
                <span>{(existingSubmission?.posterFile || existingSubmission?.posterLink) ? 'Poster Submitted (Preview)' : 'Upload Poster / Paper'}</span>
              </button>
            ) : (
              <div
                className="card-quick-register-btn"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  color: '#34d399',
                  justifyContent: 'center',
                  cursor: 'default'
                }}
              >
                <CheckCircle2 size={18} />
                <span>Registered for Event</span>
              </div>
            )}


            {/* REGISTRATION DEADLINE BADGE BELOW REGISTER BUTTON */}
            <div className="registration-deadline-badge" style={{
              marginTop: '0.85rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '12px',
              background: 'rgba(0, 114, 255, 0.15)',
              border: '1.5px solid rgba(0, 240, 255, 0.5)',
              color: '#00f0ff',
              fontSize: '0.85rem',
              fontWeight: '700',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 15px rgba(0, 114, 255, 0.25)',
              width: '100%'
            }}>
              <Calendar size={16} style={{ color: '#00f0ff', flexShrink: 0 }} />
              <span>Registration Deadline: <strong>{event.registrationDeadline || '26 August 2026'}</strong></span>
            </div>
          </div>

          {/* COLUMN 2: CENTER RULES */}
          <div className="event-rules-column">
            <div className="rules-glass-box">
              {/* QUIZ TOPICS IF ANY (PLACED AT TOP) */}
              {event.topics && event.topics.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 className="section-gold-heading">Quiz Topics:</h2>
                  <ul className="rules-bullet-list">
                    {event.topics.map((topic, idx) => (
                      <li key={idx} className="rule-item">
                        <span className="rule-bullet-dot">•</span>
                        <span className="rule-item-text">{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* RULES */}
              {event.rules && event.rules.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 className="section-gold-heading">Rules:</h2>
                  <ul className="rules-bullet-list">
                    {event.rules.map((rule, idx) => (
                      <li key={idx} className="rule-item">
                        <span className="rule-bullet-dot">•</span>
                        <span className="rule-item-text">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SPECIAL AI AGENT BOOTCAMP PROMO BANNER FOR AI AGENTS EXPO */}
              {(event.id === 'industry-2' || (event.title && event.title.toLowerCase().includes('expo'))) && (
                <div className="bootcamp-promo-banner-card">
                  <div className="bootcamp-top-header">
                    <h4 className="bootcamp-question-subtitle">DON’T KNOW HOW TO BUILD AN AI AGENT?</h4>
                    <h2 className="bootcamp-main-heading">JOIN THE AI AGENT BOOTCAMP!</h2>
                  </div>

                  <div className="bootcamp-meta-row">
                    <div className="bootcamp-date-badge">
                      <Calendar size={18} style={{ color: '#00f0ff' }} />
                      <span><strong>AUGUST 2026</strong></span>
                    </div>
                    <div className="bootcamp-ambassador-badge">
                      <Award size={18} style={{ color: '#fbbf24' }} />
                      <span>Hands-on Bootcamp with <strong>Google Student Ambassador</strong></span>
                    </div>
                  </div>

                  <div className="bootcamp-pillars-container">
                    <div className="bootcamp-pillar-item">
                      <div className="pillar-icon-circle cyan">
                        <Bot size={22} />
                      </div>
                      <span className="pillar-label-text">Learn to Build AI Agent</span>
                    </div>

                    <div className="bootcamp-pillar-item">
                      <div className="pillar-icon-circle gold">
                        <Sparkles size={22} />
                      </div>
                      <span className="pillar-label-text">Create Agent workflows</span>
                    </div>

                    <div className="bootcamp-pillar-item">
                      <div className="pillar-icon-circle purple">
                        <Zap size={22} />
                      </div>
                      <span className="pillar-label-text">Integrate Tools</span>
                    </div>

                    <div className="bootcamp-pillar-item">
                      <div className="pillar-icon-circle green">
                        <ShieldCheck size={22} />
                      </div>
                      <span className="pillar-label-text">Build & Test Your Own Agent</span>
                    </div>
                  </div>

                  {/* BOTTOM TIMELINE FLOW */}
                  <div className="bootcamp-timeline-bar">
                    <div className="timeline-node">
                      <span className="node-text">LEARN</span>
                    </div>
                    <span className="timeline-arrow">➔</span>
                    <div className="timeline-node gold">
                      <span className="node-text">BUILD</span>
                    </div>
                    <span className="timeline-arrow">➔</span>
                    <div className="timeline-node purple">
                      <span className="node-text">REGISTER</span>
                    </div>
                    <span className="timeline-arrow">➔</span>
                    <div className="timeline-node cyan">
                      <span className="node-text">SHOWCASE ON 29 AUG</span>
                    </div>
                  </div>
                </div>
              )}

              {/* JUDGING CRITERIA IF ANY */}
              {event.judgingCriteria && event.judgingCriteria.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 className="section-gold-heading">Judging Criteria:</h2>
                  <ul className="rules-bullet-list">
                    {event.judgingCriteria.map((crit, idx) => (
                      <li key={idx} className="rule-item">
                        <span className="rule-bullet-dot">•</span>
                        <span className="rule-item-text">{crit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* COMPETITION ROUNDS IF ANY (PLACED AT VERY LAST) */}
              {(event.CompetitionRounds || event.competitionRounds || event.rounds) && (event.CompetitionRounds || event.competitionRounds || event.rounds).length > 0 && (
                <div>
                  <h2 className="section-gold-heading">Competition Rounds:</h2>
                  <ul className="rules-bullet-list">
                    {(event.CompetitionRounds || event.competitionRounds || event.rounds).map((round, idx) => {
                      const isHeading = round.toLowerCase().startsWith('round') || round.endsWith(':') || round.toLowerCase().includes('guidelines');
                      return (
                        <li key={idx} className="rule-item" style={{
                          marginTop: isHeading ? '0.75rem' : '0.2rem',
                          marginBottom: isHeading ? '0.2rem' : '0.5rem',
                          paddingLeft: isHeading ? '0' : '1rem'
                        }}>
                          <span className="rule-bullet-dot" style={{ color: isHeading ? '#00f2fe' : '#94a3b8' }}>
                            {isHeading ? '' : '•'}
                          </span>
                          <span className="rule-item-text" style={{
                            fontWeight: isHeading ? '700' : 'normal',
                            color: isHeading ? '#00f2fe' : '#e2e8f0',
                            fontSize: isHeading ? '1rem' : '0.92rem'
                          }}>
                            {round}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: RIGHT PRIZES & CONTACTS (BESIDE RULES) */}
          <div className="event-sidebar-column">
            {/* CASH PRIZES BOX */}
            {event.prizes !== null && event.prizes !== false && !event.hidePrizes && (
              <div className="sidebar-glass-box">
                <h2 className="section-gold-heading">
                  <Award size={20} className="gold-heading-icon" /> Cash Prizes:
                </h2>
                <div className="prizes-list">
                  {event.prizes && event.prizes.length > 0 ? (
                    event.prizes.map((p, idx) => (
                      <div key={idx} className="prize-item-row">
                        <span className="prize-rank-text">{p.rank}</span>
                        <span className="prize-dash-text">-</span>
                        <span className="prize-amount-text">{p.amount}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="prize-item-row">
                        <span className="prize-rank-text">First</span>
                        <span className="prize-dash-text">-</span>
                        <span className="prize-amount-text">To be announced</span>
                      </div>
                      <div className="prize-item-row">
                        <span className="prize-rank-text">Second</span>
                        <span className="prize-dash-text">-</span>
                        <span className="prize-amount-text">To be announced</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* CONTACT / COORDINATORS BOX */}
            <div className="sidebar-glass-box" style={{ marginTop: '1.25rem' }}>
              <h2 className="section-gold-heading">
                <Phone size={18} className="gold-heading-icon" /> Event Coordinators:
              </h2>
              <div className="contacts-list">
                {event.coordinators && event.coordinators.length > 0 ? (
                  event.coordinators.map((c, idx) => {
                    let formattedName = c.name || '';
                    if (formattedName && !formattedName.toLowerCase().includes('student') && !formattedName.includes('(Faculty)')) {
                      formattedName = `${formattedName} (Faculty)`;
                    }
                    return (
                      <div key={idx} className="contact-item-row">
                        {formattedName && <span className="contact-name-text">{formattedName}:</span>}{' '}
                        {c.phone ? (
                          c.phone.trim().startsWith('+') ? (
                            <a href={`tel:${c.phone}`} className="contact-phone-link">
                              {c.phone}
                            </a>
                          ) : (
                            <span className="contact-phone-link" style={{ textDecoration: 'none' }}>
                              {c.phone}
                            </span>
                          )
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div className="contact-item-row">
                      <span className="contact-name-text">Faculty Coordinator:</span>{' '}
                      <a href="tel:+919392960026" className="contact-phone-link">
                        +91 93929 60026
                      </a>
                    </div>
                    <div className="contact-item-row">
                      <span className="contact-name-text">Student Coordinator:</span>{' '}
                      <a href="tel:+918019171205" className="contact-phone-link">
                        +91 80191 71205
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Modal for Reels and Poster */}
      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        event={event}
        currentUser={currentUser}
        onSubmitSuccess={(updatedEvents) => {
          // Find submitted item in updated events and store locally
          if (Array.isArray(updatedEvents)) {
            const cleanT = String(event?.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const match = updatedEvents.find(e => {
              const eT = String(e.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              return cleanT && eT && (cleanT.includes(eT) || eT.includes(cleanT));
            });
            if (match && match.submission) {
              setLocalSubmission(match.submission);
            }
          }
          if (onSubmissionUpdate) {
            onSubmissionUpdate(updatedEvents);
          }
        }}
      />
    </div>
  );
}

