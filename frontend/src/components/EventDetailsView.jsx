import React from 'react';
import { ArrowLeft, Award, Phone, UserPlus, Sparkles, ShieldCheck } from 'lucide-react';

export default function EventDetailsView({ event, onBack, onRegister, currentUser = null, onEnrollEvent }) {
  if (!event) return null;

  const isEnrolled = currentUser?.registeredEvents?.some(e => e.id === event.id || e.title === event.title);

  return (
    <div className="event-detail-page">
      <div className="event-detail-container">
        {/* TOP HEADER WITH CENTERED HEADINGS */}
        <header className="event-detail-header-centered">
          {/* Top Row: Back Button (Left) & Register Button (Right) */}
          <div className="header-top-nav-row">
            <button className="back-to-events-btn" onClick={onBack}>
              <ArrowLeft size={18} />
              <span>Back to Events</span>
            </button>

            {!currentUser ? (
              <button
                className="register-event-hero-btn"
                onClick={() => onRegister && onRegister(event)}
              >
                <UserPlus size={18} />
                <span>Register / Sign up</span>
              </button>
            ) : isEnrolled ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '30px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                fontSize: '0.85rem',
                fontWeight: '700'
              }}>
                <ShieldCheck size={18} />
                <span>Enrolled Participant ✅</span>
              </div>
            ) : (
              <button
                className="register-event-hero-btn"
                onClick={() => onEnrollEvent && onEnrollEvent(event)}
              >
                <Sparkles size={18} />
                <span>Register for this Event</span>
              </button>
            )}
          </div>

          {/* Centered Headings */}
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
                src={event.image || '/images/event_hackathon_1786084020517.png'}
                alt={event.title}
                className="event-poster-image"
              />
            </div>
            {/* Quick Register Button Below Poster */}
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
            ) : null}
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
                      const isHeading = round.toLowerCase().startsWith('round');
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

            {/* CONTACT NUMBERS BOX */}
            <div className="sidebar-glass-box" style={{ marginTop: '1.25rem' }}>
              <h2 className="section-gold-heading">
                <Phone size={18} className="gold-heading-icon" /> Contact no:
              </h2>
              <div className="contacts-list">
                {event.coordinators && event.coordinators.length > 0 ? (
                  event.coordinators.map((c, idx) => (
                    <div key={idx} className="contact-item-row">
                      <span className="contact-name-text">{c.name}:</span>{' '}
                      <a href={`tel:${c.phone}`} className="contact-phone-link">
                        {c.phone}
                      </a>
                    </div>
                  ))
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
    </div>
  );
}
