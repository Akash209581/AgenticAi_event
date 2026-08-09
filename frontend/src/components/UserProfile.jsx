import React, { useState } from 'react';
import { 
  User, Calendar, Hash, Phone, Mail, GraduationCap, Copy, Check, 
  Sparkles, LogOut, ShieldCheck, Trophy, Brain, Zap, FileText, 
  Mic, Bot, Users, Video, Music, HelpCircle, ArrowRight, Trash2, Lock
} from 'lucide-react';


const registeredEventsList = [
  // Technical Category
  { id: 'tech-1', catId: 'technical', category: 'Technical', title: 'Agentic AI Hackathon', icon: Brain, color: '#00f2fe', image: '/images/event_hackathon_1786084020517.png' },
  { id: 'tech-2', catId: 'technical', category: 'Technical', title: 'AI Prompt Combat', icon: Zap, color: '#38bdf8', image: '/images/event_prompt_1786084056457.png' },
  { id: 'tech-3', catId: 'technical', category: 'Technical', title: 'Paper / Poster Presentation', icon: FileText, color: '#0284c7' },
  
  // Industry Category
  { id: 'ind-1', catId: 'industry', category: 'Industry & Innovation', title: 'Podcast with Industry Professionals', icon: Mic, color: '#c084fc' },
  { id: 'ind-2', catId: 'industry', category: 'Industry & Innovation', title: 'AI Agents Expo', icon: Bot, color: '#a855f7' },
  { id: 'ind-3', catId: 'industry', category: 'Industry & Innovation', title: 'AI Summit - Industry Interaction', icon: Users, color: '#e879f9' },

  // Creative Category
  { id: 'cre-1', catId: 'creative', category: 'Creative', title: 'Reels Competition (AI for Society)', icon: Video, color: '#fbbf24', image: '/images/cat_creative_1786083988989.png' },
  { id: 'cre-2', catId: 'creative', category: 'Creative', title: 'AI Musical Competition', icon: Music, color: '#f59e0b' },
  { id: 'cre-3', catId: 'creative', category: 'Creative', title: 'AI Quiz', icon: HelpCircle, color: '#d97706' }
];

export default function UserProfile({ user, onLogout, onExploreEvents, onUnenrollEvent }) {
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const handleCopyId = () => {
    if (user.aiId) {
      navigator.clipboard.writeText(user.aiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="user-profile-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      
      {/* Profile Header Banner Card */}
      <div className="cyber-card profile-header-card" style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
        border: '1px solid rgba(0, 242, 254, 0.3)',
        borderRadius: '20px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Ambient Glow Background Accent */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(0, 242, 254, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}></div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
          
          {/* Left: Avatar + Name & AI ID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(99, 102, 241, 0.3))',
              border: '2px solid #00f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 242, 254, 0.3)',
              flexShrink: 0
            }}>
              <User size={36} color="#00f2fe" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h1 style={{
                  fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                  fontWeight: '800',
                  color: '#ffffff',
                  margin: 0,
                  fontFamily: 'var(--font-heading)'
                }}>
                  {user.name}
                </h1>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}>
                  <ShieldCheck size={14} /> REGISTERED ATTENDEE
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  AI ID: <strong style={{ color: '#00f2fe', fontFamily: 'monospace', fontSize: '1rem' }}>{user.aiId}</strong>
                </span>

                <button
                  type="button"
                  onClick={handleCopyId}
                  className="btn-secondary"
                  style={{
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.75rem',
                    borderRadius: '8px',
                    gap: '0.3rem'
                  }}
                >
                  {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy ID'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Logout Action */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="btn-secondary"
              style={{
                color: '#f87171',
                borderColor: 'rgba(248, 113, 113, 0.4)',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '0.5rem 1.2rem',
                fontSize: '0.9rem'
              }}
            >
              <LogOut size={16} /> Logout Account
            </button>
          )}
        </div>
      </div>

      {/* Profile Details Grid */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          color: '#38bdf8',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <User size={20} color="#38bdf8" /> Participant Profile Details
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem'
        }}>
          {/* Name Card */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.25rem', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <User size={14} color="#38bdf8" /> Full Name
            </span>
            <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>{user.name}</strong>
          </div>

          {/* AI ID Card */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(0, 242, 254, 0.2)', padding: '1rem 1.25rem', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <Sparkles size={14} color="#00f2fe" /> Agentic AI Registration ID
            </span>
            <strong style={{ color: '#00f2fe', fontFamily: 'monospace', fontSize: '1.1rem' }}>{user.aiId}</strong>
          </div>

          {/* Reg No Card */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.25rem', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <Hash size={14} color="#38bdf8" /> University Registration No
            </span>
            <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>{user.regNo}</strong>
          </div>

          {/* Year Card */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.25rem', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <GraduationCap size={14} color="#38bdf8" /> Year of Study
            </span>
            <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>{user.year ? `Year ${user.year}` : 'N/A'}</strong>
          </div>

          {/* DOB Card */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.25rem', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <Calendar size={14} color="#38bdf8" /> Date of Birth (DOB)
            </span>
            <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>{user.dob}</strong>
          </div>

          {/* Phone Card */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.25rem', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <Phone size={14} color="#38bdf8" /> Phone Number
            </span>
            <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>{user.phone}</strong>
          </div>

          {/* Email Card */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.25rem', borderRadius: '12px', gridColumn: 'span 1' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <Mail size={14} color="#38bdf8" /> Email Address
            </span>
            <strong style={{ color: '#f8fafc', fontSize: '1.05rem', wordBreak: 'break-all' }}>{user.email}</strong>
          </div>
        </div>
      </div>

      {/* Registered Events Section */}
      <div style={{ marginTop: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{
              fontSize: '1.35rem',
              fontWeight: '800',
              color: '#ffffff',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <Trophy size={24} color="#fbbf24" /> My Registered Events & Competitions
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {user.registeredEvents && user.registeredEvents.length > 0
                ? `You are enrolled in ${user.registeredEvents.length} event competition${user.registeredEvents.length > 1 ? 's' : ''}:`
                : 'You have not enrolled in any specific event competitions yet.'}
            </p>
          </div>

          {onExploreEvents && (
            <button
              onClick={onExploreEvents}
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
            >
              Explore All Events <ArrowRight size={16} />
            </button>
          )}
        </div>

        {/* Check if user has registered for any events */}
        {(!user.registeredEvents || user.registeredEvents.length === 0) ? (
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px dashed rgba(0, 242, 254, 0.3)',
            borderRadius: '16px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            margin: '1rem 0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(0, 242, 254, 0.1)', padding: '1rem', borderRadius: '50%', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                <Sparkles size={40} color="#00f2fe" />
              </div>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
              No Events Registered Yet
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '520px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
              You are registered for Agentic AI Day 2026, but haven't enrolled in any specific competition yet. Browse our 9 event competitions and click <strong>"Register for Event"</strong> to enroll!
            </p>
            {onExploreEvents && (
              <button
                onClick={onExploreEvents}
                className="btn-primary"
                style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                Browse & Register for Events <ArrowRight size={16} />
              </button>
            )}
          </div>
        ) : (
          /* Registered Events Cards Grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}>
            {user.registeredEvents.map((item, idx) => {
              const matchedData = registeredEventsList.find(r => r.id === item.id || r.title.toLowerCase() === item.title.toLowerCase());
              const IconComp = matchedData?.icon || Trophy;
              const itemColor = matchedData?.color || '#00f2fe';
              const categoryName = item.categoryName || matchedData?.category || 'Technical';

              return (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div>
                    {/* Badge & Category Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        color: itemColor,
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        border: `1px solid ${itemColor}40`
                      }}>
                        {categoryName}
                      </span>

                      <span style={{
                        fontSize: '0.75rem',
                        color: '#10b981',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        ● Enrolled
                      </span>
                    </div>

                    {/* Event Icon + Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.75rem' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: `linear-gradient(135deg, ${itemColor}22, rgba(15, 23, 42, 0.9))`,
                        border: `1px solid ${itemColor}50`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <IconComp size={22} color={itemColor} />
                      </div>

                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: '#f8fafc',
                        margin: 0,
                        lineHeight: '1.3'
                      }}>
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {/* Footer status button */}
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    {item.isTeam || item.teamId ? (
                      <span
                        title="Team Registration Locked: You are part of an active team. Only Admin can remove team registrations."
                        style={{
                          background: 'rgba(234, 179, 8, 0.12)',
                          border: '1px solid rgba(234, 179, 8, 0.35)',
                          color: '#fde047',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          cursor: 'not-allowed'
                        }}
                      >
                        <Lock size={13} /> Team Locked
                      </span>
                    ) : (
                      <button
                        onClick={() => onUnenrollEvent && onUnenrollEvent(item.id, item.title)}
                        type="button"
                        title="Delete / Cancel event registration"
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#f87171',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                          e.currentTarget.style.borderColor = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                        }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    )}

                    {onExploreEvents && (

                      <button
                        onClick={onExploreEvents}
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: itemColor,
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}
                      >
                        Rules →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
