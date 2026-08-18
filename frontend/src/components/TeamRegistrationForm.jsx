import React, { useState, useEffect } from 'react';
import { apiFetch } from '../config/api';
import {
  Users,
  UserCheck,
  Search,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Crown,
  Info,
  Zap,
  Award
} from 'lucide-react';
import { isSameEvent } from '../data/eventsRulesData';

const TEAM_EVENTS = [
  {
    id: 'creative-1',
    title: 'REELS COMPETITION (AI FOR SOCIETY)',
    shortName: 'Reels Competition',
    category: 'CREATIVE',
    minSize: 1,
    maxSize: 3,
    badgeText: '1 to 3 Members',
    note: 'Solo, duo or trio entry. Only the Team Leader can submit the reel link.'
  },
  {
    id: 'technical-1',
    title: 'AGENTIC AI HACKATHON',
    shortName: 'Hackathon',
    category: 'TECHNICAL',
    minSize: 4,
    maxSize: 5,
    badgeText: '4 to 5 Members',
    note: 'Strictly 4 members required, 5th member optional. Open to students of any academic year.'
  },
  {
    id: 'technical-2',
    title: 'AI PROMPT COMBAT',
    shortName: 'AI Prompt Combat',
    category: 'TECHNICAL',
    minSize: 2,
    maxSize: 3,
    badgeText: '2 to 3 Members',
    note: 'Bring your laptops for live AI image generation combat.'
  },
  {
    id: 'technical-3',
    title: 'PAPER / POSTER PRESENTATION',
    shortName: 'Paper or Poster Presentation',
    category: 'TECHNICAL',
    minSize: 1,
    maxSize: 3,
    badgeText: '1 to 3 Members',
    note: 'Maximum 10 slides or A1 poster format.'
  },
  {
    id: 'industry-2',
    title: 'AI AGENTS EXPO',
    shortName: 'AI Agents Expo',
    category: 'INDUSTRY & INNOVATION',
    minSize: 2,
    maxSize: 4,
    badgeText: '2 to 4 Members',
    note: 'Showcase live working AI Agent applications.'
  },
  {
    id: 'creative-3',
    title: 'AGENTIC DAY QUIZ CHALLENGE 2026',
    shortName: 'AI Quiz',
    category: 'CREATIVE',
    minSize: 3,
    maxSize: 5,
    badgeText: '3 to 5 Members',
    note: '4 competitive rounds testing real-world AI reasoning.'
  },
  {
    id: 'creative-2',
    title: 'AI MUSICAL COMPETITION',
    shortName: 'AI Musical Competition',
    category: 'CREATIVE',
    minSize: 3,
    maxSize: 3,
    exactSize: 3,
    badgeText: 'Strictly 3 Members',
    note: 'Real-time AI song creation (audio, lyrics & prompts).'
  },
  {
    id: 'creative-4',
    title: 'QUESTX',
    shortName: 'QuestX',
    category: 'CREATIVE',
    minSize: 5,
    maxSize: 5,
    exactSize: 5,
    badgeText: 'Strictly 5 Members',
    note: '6-Round Interactive AI Creative Quest (CSE 2nd, 3rd & 4th years).'
  },
  {
    id: 'innovative-1',
    title: 'SPARKX',
    shortName: 'SparkX',
    category: 'INNOVATIVE',
    minSize: 2,
    maxSize: 3,
    badgeText: '2 to 3 Members',
    note: '3-Round Design Thinking & AI Innovation Challenge.'
  }
];


export default function TeamRegistrationForm({ onBack, onSuccess, currentUser, initialEventId }) {
  const findMatchingEventId = (evId) => {
    if (!evId) return TEAM_EVENTS[0].id;
    const cleanId = String(evId).toLowerCase().trim();
    const match = TEAM_EVENTS.find(e => 
      e.id === evId ||
      e.id.toLowerCase() === cleanId ||
      (cleanId.includes('-') && e.id === cleanId) ||
      (e.title && e.title.toLowerCase().includes(cleanId)) ||
      (e.shortName && e.shortName.toLowerCase().includes(cleanId))
    );
    return match ? match.id : TEAM_EVENTS[0].id;
  };

  const [selectedEventId, setSelectedEventId] = useState(() => findMatchingEventId(initialEventId));
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (initialEventId) {
      const matchedId = findMatchingEventId(initialEventId);
      if (matchedId) {
        setSelectedEventId(matchedId);
      }
      const scrollTimer = setTimeout(() => {
        if (teamFormRef.current) {
          teamFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
      return () => clearTimeout(scrollTimer);
    }
  }, [initialEventId]);

  useEffect(() => {
    if (initialEventId) {
      const scrollTimer = setTimeout(() => {
        if (teamFormRef.current) {
          teamFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 180);
      return () => clearTimeout(scrollTimer);
    }
  }, []);
  
  // Slots state: array of { id, aiId, student: null, loading: false, error: '' }
  const [slots, setSlots] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  const selectedEvent = TEAM_EVENTS.find(e => e.id === selectedEventId) || TEAM_EVENTS[0];
  const teamFormRef = React.useRef(null);

  const handleSelectEvent = (eventId) => {
    setSelectedEventId(eventId);
    setTimeout(() => {
      if (teamFormRef.current) {
        teamFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Initialize or re-adjust slots whenever selected event changes
  useEffect(() => {
    const requiredMin = selectedEvent.minSize;
    
    // Create initial slots
    const initialSlots = Array.from({ length: requiredMin }, (_, i) => ({
      id: i + 1,
      aiId: i === 0 && currentUser?.aiId ? currentUser.aiId : '',
      student: null,
      loading: false,
      error: ''
    }));

    setSlots(initialSlots);
    setFormError('');

    // If current user AI ID is present in slot 1, trigger auto lookup
    if (currentUser?.aiId) {
      lookupStudent(currentUser.aiId, 0, initialSlots);
    }
  }, [selectedEventId]);

  // Lookup student details by AI ID
  const lookupStudent = async (inputAiId, slotIndex, currentSlots = slots) => {
    const trimmed = inputAiId.trim();
    if (!trimmed) {
      updateSlot(slotIndex, { student: null, loading: false, error: '', isEnrolled: true }, currentSlots);
      return;
    }

    updateSlot(slotIndex, { loading: true, error: '' }, currentSlots);

    try {
      const url = `/student/${encodeURIComponent(trimmed)}?eventId=${encodeURIComponent(selectedEvent.id)}&eventTitle=${encodeURIComponent(selectedEvent.title)}`;
      const { res, data } = await apiFetch(url);

      if (data.success && data.student) {
        if (data.isEnrolledInEvent === false) {
          updateSlot(
            slotIndex,
            {
              student: data.student,
              loading: false,
              isEnrolled: false,
              error: `Student ${data.student.name} (${data.student.aiId}) is NOT registered for '${selectedEvent.shortName}'. Please register for this event on the Events page first!`
            },
            currentSlots
          );
        } else if (data.hasSubmittedEvent === true) {
          updateSlot(
            slotIndex,
            {
              student: data.student,
              loading: false,
              isEnrolled: true,
              error: `Student ${data.student.name} (${data.student.aiId}) has already submitted the work/poster for this event. Team registration is disabled after submission!`
            },
            currentSlots
          );
        } else {
          updateSlot(
            slotIndex,
            { student: data.student, loading: false, isEnrolled: true, error: '' },
            currentSlots
          );
        }
      } else {
        updateSlot(
          slotIndex,
          { student: null, loading: false, isEnrolled: false, error: data.message || 'Student not registered in system.' },
          currentSlots
        );
      }
    } catch (e) {
      updateSlot(
        slotIndex,
        { student: null, loading: false, isEnrolled: false, error: 'Failed to look up student AI ID.' },
        currentSlots
      );
    }
  };

  const updateSlot = (index, updates, targetSlots = slots) => {
    setSlots(prev => {
      const list = targetSlots === slots ? [...prev] : [...targetSlots];
      if (list[index]) {
        list[index] = { ...list[index], ...updates };
      }
      return list;
    });
  };

  const handleAiIdChange = (index, value) => {
    if (index === 0 && currentUser?.aiId) {
      return; // Member #1 is locked to the logged-in student's AI ID
    }
    const uppercaseVal = value.toUpperCase();
    setSlots(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        aiId: uppercaseVal,
        student: null,
        isEnrolled: true,
        error: ''
      };
      return copy;
    });
  };


  const handleAiIdBlur = (index) => {
    const slot = slots[index];
    if (slot && slot.aiId.trim()) {
      lookupStudent(slot.aiId, index);
    }
  };

  const addSlot = () => {
    if (slots.length >= selectedEvent.maxSize) return;
    setSlots(prev => [
      ...prev,
      { id: prev.length + 1, aiId: '', student: null, loading: false, isEnrolled: true, error: '' }
    ]);
  };

  const removeSlot = (index) => {
    if (slots.length <= selectedEvent.minSize) return;
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  const currentUserHasSubmittedSelectedEvent = React.useMemo(() => {
    if (!currentUser || !Array.isArray(currentUser.registeredEvents)) return false;
    
    return currentUser.registeredEvents.some(e => {
      const hasSub = Boolean(e.submission && (e.submission.reelLink || e.submission.posterFile || e.submission.posterLink));
      return hasSub && isSameEvent(selectedEvent, e);
    });
  }, [currentUser, selectedEvent]);

  // Hackathon Year Distribution Check helper (Open to all years)
  const checkHackathonYearComposition = () => {
    if (selectedEvent.id !== 'technical-1') return null;
    
    const years = slots.map(s => s.student?.year).filter(Boolean);
    if (years.length === 0) return null;

    return {
      isValid: true,
      message: '✓ Open team composition: Students from any academic year are eligible to form a team.'
    };
  };

  const hackathonCheck = checkHackathonYearComposition();

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!teamName.trim()) {
      setFormError('Please enter a Team Name.');
      return;
    }

    // Check if current user has already submitted this event
    const currentUserHasSubmittedSelectedEvent = (() => {
      if (!currentUser || !Array.isArray(currentUser.registeredEvents)) return false;
      const cleanEventTitle = String(selectedEvent.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      
      return currentUser.registeredEvents.some(e => {
        const cleanETitle = String(e.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const hasSub = e.submission && (e.submission.reelLink || e.submission.posterFile || e.submission.posterLink);
        
        if (cleanEventTitle && cleanETitle && (cleanEventTitle.includes(cleanETitle) || cleanETitle.includes(cleanEventTitle))) {
          return hasSub;
        }
        const eId = String(e.id || '').toLowerCase();
        const selId = String(selectedEvent.id || '').toLowerCase();
        if (eId && selId && (eId === selId || selId.includes(eId))) {
          return hasSub;
        }
        return false;
      });
    })();

    if (currentUserHasSubmittedSelectedEvent) {
      setFormError('Team Registration Blocked: You have already submitted the work/poster for this event. Team creation is only allowed BEFORE submission.');
      return;
    }

    // Validate slots completeness
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (!s.aiId.trim()) {
        setFormError(`Please enter AI ID for Member #${i + 1} (${i === 0 ? 'Team Leader' : 'Team Mate'}).`);
        return;
      }
      if (!s.student) {
        setFormError(`Member #${i + 1} (${s.aiId}) is not verified. Please check AI ID.`);
        return;
      }
      if (s.isEnrolled === false) {
        setFormError(`Member #${i + 1} (${s.student.name}) is NOT registered for ${selectedEvent.shortName}. Only students registered for this event are eligible to form or join a team.`);
        return;
      }
      if (s.error) {
        setFormError(`Member #${i + 1} (${s.student?.name || s.aiId}) has a validation error: ${s.error}`);
        return;
      }
    }


    // Duplicate check in form
    const aiIds = slots.map(s => s.aiId.trim().toUpperCase());
    const uniqueIds = new Set(aiIds);
    if (uniqueIds.size !== aiIds.length) {
      setFormError('Duplicate AI IDs found in your team. Each member must be unique.');
      return;
    }

    // Verify Member #1 (Team Leader) matches currentUser AI ID
    if (currentUser?.aiId && slots[0]?.aiId?.trim().toUpperCase() !== currentUser.aiId.trim().toUpperCase()) {
      setFormError(`Member #1 (Team Leader) must be your own logged-in AI ID (${currentUser.aiId}). You cannot register a team using another student's ID.`);
      return;
    }

    setSubmitLoading(true);

    try {
      const membersPayload = slots.map((s, idx) => ({
        aiId: s.student.aiId,
        name: s.student.name,
        regNo: s.student.regNo,
        year: s.student.year,
        email: s.student.email,
        phone: s.student.phone,
        isLeader: idx === 0
      }));

      const { res, data } = await apiFetch('/team-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: teamName.trim(),
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.title,
          currentUserAiId: currentUser?.aiId,
          members: membersPayload
        })
      });

      if (data.success && data.team) {
        setRegistrationSuccess(data.team);
        if (onSuccess) onSuccess(data.team);
      } else {
        setFormError(data.message || 'Failed to register team. Please try again.');
      }
    } catch (err) {
      setFormError('Server connection error. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // SUCCESS CONFIRMATION SCREEN
  if (registrationSuccess) {
    return (
      <div className="registration-container fade-in">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(0, 242, 254, 0.15)',
            border: '2px solid var(--primary-cyan)',
            color: 'var(--primary-cyan)',
            marginBottom: '1rem',
            boxShadow: '0 0 30px rgba(0, 242, 254, 0.3)'
          }}>
            <CheckCircle2 size={48} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', background: 'linear-gradient(135deg, #00f2fe, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            TEAM REGISTRATION SUCCESSFUL!
          </h2>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.5rem' }}>
            Your team has been officially registered for Agentic AI Day 2026.
          </p>
        </div>

        <div className="profile-card" style={{ maxWidth: '650px', margin: '0 auto 2rem auto', padding: '2rem', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '16px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary-cyan)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                OFFICIAL TEAM ID
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ffffff', fontFamily: 'monospace' }}>
                {registrationSuccess.teamId}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>EVENT</span>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#4facfe' }}>
                {registrationSuccess.eventTitle}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>TEAM NAME</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ffffff' }}>
              {registrationSuccess.teamName}
            </div>
          </div>

          <div>
            <h4 style={{ color: 'var(--primary-cyan)', marginBottom: '0.75rem', fontSize: '0.95rem', letterSpacing: '0.5px' }}>
              REGISTERED TEAM MEMBERS ({registrationSuccess.members.length}):
            </h4>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {registrationSuccess.members.map((m, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: m.isLeader ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: m.isLeader ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {m.isLeader ? (
                      <Crown size={20} style={{ color: '#ffd700' }} />
                    ) : (
                      <Users size={18} style={{ color: 'var(--text-dim)' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: '700', color: '#ffffff' }}>
                        {m.name} {m.isLeader && <span style={{ fontSize: '0.75rem', color: '#ffd700', marginLeft: '0.4rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(255,215,0,0.15)' }}>LEADER</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        Reg No: {m.regNo} • Year {m.year}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary-cyan)', fontFamily: 'monospace', fontWeight: '700' }}>
                    {m.aiId}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setRegistrationSuccess(null);
              setTeamName('');
              setSlots([]);
            }}
          >
            Register Another Team
          </button>
          {onBack && (
            <button className="btn btn-primary" onClick={onBack}>
              Return to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="registration-container fade-in" style={{ padding: '1rem 0' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-cyan)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '1.25rem'
            }}
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
        )}
           <div className="team-portal-header-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{
            background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
            padding: '0.5rem',
            borderRadius: '10px',
            color: '#0b1120',
            display: 'flex',
            flexShrink: 0
          }}>
            <Users size={24} />
          </div>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <h1 className="team-portal-heading" style={{ fontWeight: '800', margin: 0, background: 'linear-gradient(135deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: '1.2' }}>
              TEAM REGISTRATION PORTAL
            </h1>
            <p style={{ color: 'var(--text-dim)', margin: '0.2rem 0 0 0', fontSize: '0.88rem' }}>
              Register your team for Agentic AI Day competitions using registered AI IDs.
            </p>
          </div>
        </div>
      </div>

      {/* STEP 1: EVENT SELECTION GRID */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary-cyan)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} /> SELECT COMPETITION EVENT (7 EVENTS AVAILABLE)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.85rem' }}>
          {TEAM_EVENTS.map((ev) => {
            const isSelected = selectedEventId === ev.id;
            return (
              <div
                key={ev.id}
                onClick={() => handleSelectEvent(ev.id)}
                className={`event-card ${isSelected ? 'active' : ''}`}
                style={{
                  background: isSelected ? 'rgba(0, 242, 254, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                  border: isSelected ? '2px solid var(--primary-cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    color: 'var(--primary-cyan)',
                    background: 'rgba(0, 242, 254, 0.12)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '50px',
                    border: '1px solid rgba(0, 242, 254, 0.3)'
                  }}>
                    {ev.badgeText}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.5rem' }}>
                  {ev.title}
                </h4>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                  {ev.note}
                </p>

                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: isSelected ? 'var(--primary-cyan)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {isSelected ? '✓ Selected — Form Team Below' : 'Click to Select & Form Team →'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 2: TEAM DETAILS FORM */}
      <form
        ref={teamFormRef}
        onSubmit={handleSubmit}
        className="form-card team-form-card"
        style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          scrollMarginTop: '110px'
        }}
      >
        <h3 className="team-formation-heading" style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Zap size={20} style={{ color: 'var(--primary-cyan)', flexShrink: 0 }} />
          TEAM FORMATION FOR <span style={{ color: 'var(--primary-cyan)' }}>{selectedEvent.title}</span>
        </h3>

        {currentUserHasSubmittedSelectedEvent && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1.5px solid rgba(248, 113, 113, 0.45)',
            color: '#f87171',
            padding: '1.25rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.95rem'
          }}>
            <AlertCircle size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong>Team Registration Disabled:</strong> You have already submitted the work/poster for <strong>{selectedEvent.title}</strong>. Team formation is not permitted after work has been submitted.
            </div>
          </div>
        )}

        {/* ⚠️ IMPORTANT: Register Event First Notice */}
        <div className="team-prereq-notice" style={{
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1.5px solid rgba(251, 191, 36, 0.5)',
          borderRadius: '14px',
          padding: '1.1rem 1.4rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <Info size={22} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <div style={{ fontWeight: '800', color: '#fbbf24', fontSize: '0.95rem', marginBottom: '0.3rem' }}>
              ⚠️ Prerequisite: Register for the Event First!
            </div>
            <div style={{ color: '#e2e8f0', fontSize: '0.875rem', lineHeight: '1.55' }}>
              <strong>All team members must individually register for <em>{selectedEvent.title}</em> before forming a team.</strong><br />
              Go to the <strong>Events page → click on the event → Register</strong> to enroll each member. Only registered participants can be added to a team.
            </div>
          </div>
        </div>

        {/* Team Name Input */}
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.75rem', display: 'block' }}>
            ENTER TEAM NAME *
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. AI Innovators / Neural Knights"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            disabled={currentUserHasSubmittedSelectedEvent}
            style={{
              width: '100%',
              fontSize: '1rem',
              padding: '0.85rem 1.1rem',
              color: '#ffffff',
              WebkitTextFillColor: '#ffffff',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1.5px solid rgba(0, 242, 254, 0.4)',
              borderRadius: '12px',
              cursor: currentUserHasSubmittedSelectedEvent ? 'not-allowed' : 'text'
            }}
          />
        </div>

        {/* Hackathon Year Composition Alert if applicable */}
        {hackathonCheck && (
          <div style={{
            background: hackathonCheck.isValid ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
            border: hackathonCheck.isValid ? '1px solid #22c55e' : '1px solid #eab308',
            color: hackathonCheck.isValid ? '#4ade80' : '#fde047',
            padding: '1.1rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Info size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Hackathon Year Composition Rule:</strong> {hackathonCheck.message}
            </div>
          </div>
        )}
           {/* Dynamic Member Slots */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="team-member-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--primary-cyan)' }}>
              TEAM MEMBERS ({slots.length} of max {selectedEvent.maxSize})
            </label>

            {/* Add / Remove buttons if within range */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {slots.length < selectedEvent.maxSize && !currentUserHasSubmittedSelectedEvent && (
                <button
                  type="button"
                  onClick={addSlot}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={14} /> Add Member
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {slots.map((slot, index) => {
              const isLeader = index === 0;
              const isVerified = (isLeader && !!currentUser?.aiId && !!slot.student) || (!!slot.student);
              return (
                <div
                  key={slot.id}
                  className="team-member-slot-card"
                  style={{
                    background: isLeader ? 'rgba(0, 242, 254, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                    border: slot.error
                      ? '1px solid #ef4444'
                      : slot.student
                      ? '1px solid #22c55e'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem 1rem',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <div className="team-member-title-group" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem 0.5rem', flexWrap: 'wrap' }}>
                      {isLeader ? (
                        <Crown size={18} style={{ color: '#ffd700', flexShrink: 0 }} />
                      ) : (
                        <Users size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                      )}
                      <span className="team-member-badge-leader" style={{ fontWeight: '700', fontSize: '0.9rem', color: isLeader ? '#ffd700' : '#ffffff' }}>
                        {isLeader ? 'MEMBER #1 — TEAM LEADER' : `MEMBER #${index + 1}`}
                      </span>
                      {isLeader && currentUser?.aiId && (
                        <span style={{ fontSize: '0.7rem', background: 'rgba(0, 242, 254, 0.12)', color: '#00f2fe', padding: '0.12rem 0.45rem', borderRadius: '5px', fontWeight: '800', border: '1px solid rgba(0, 242, 254, 0.3)', whiteSpace: 'nowrap' }}>
                          YOUR ACCOUNT
                        </span>
                      )}
                    </div>

                    {!isLeader && slots.length > selectedEvent.minSize && (
                      <button
                        type="button"
                        onClick={() => removeSlot(index)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0.3rem 0.55rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.78rem',
                          fontWeight: '600'
                        }}
                        title="Remove member"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>

                  {/* AI ID Input Group (Unified Cyber Input Bar) */}
                  <div className="team-ai-id-input-group" style={{ display: 'flex', width: '100%', marginBottom: '0.4rem', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid rgba(0, 242, 254, 0.4)', background: 'rgba(15, 23, 42, 0.85)' }}>
                    <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ENTER AI ID (E.G. VUCSE00001)"
                        value={slot.aiId}
                        readOnly={(isLeader && !!currentUser?.aiId) || currentUserHasSubmittedSelectedEvent}
                        onChange={(e) => handleAiIdChange(index, e.target.value)}
                        onBlur={() => handleAiIdBlur(index)}
                        style={{
                          width: '100%',
                          textTransform: 'uppercase',
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          padding: '0.75rem 0.85rem',
                          fontSize: '0.88rem',
                          color: '#ffffff',
                          WebkitTextFillColor: '#ffffff',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          cursor: ((isLeader && !!currentUser?.aiId) || currentUserHasSubmittedSelectedEvent) ? 'not-allowed' : undefined
                        }}
                      />
                      {slot.loading && (
                        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', color: 'var(--primary-cyan)', fontWeight: '600' }}>
                          Verifying...
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => lookupStudent(slot.aiId, index)}
                      disabled={(isLeader && !!currentUser?.aiId && !!slot.student) || currentUserHasSubmittedSelectedEvent}
                      style={{
                        flex: '0 0 auto',
                        padding: '0 0.9rem',
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        border: 'none',
                        borderLeft: '1px solid rgba(0, 242, 254, 0.3)',
                        background: (isLeader && !!currentUser?.aiId && !!slot.student)
                          ? 'rgba(34, 197, 94, 0.25)'
                          : 'linear-gradient(135deg, #00f2fe, #4facfe)',
                        color: (isLeader && !!currentUser?.aiId && !!slot.student) ? '#34d399' : '#0b1120',
                        opacity: currentUserHasSubmittedSelectedEvent ? 0.6 : 1,
                        cursor: ((isLeader && !!currentUser?.aiId && !!slot.student) || currentUserHasSubmittedSelectedEvent) ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Search size={14} />
                      <span>{isLeader && !!currentUser?.aiId && !!slot.student ? 'Auto Verified' : 'Verify'}</span>
                    </button>
                  </div>


                  {/* Error display */}
                  {slot.error && (
                    <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.45rem 0.65rem', borderRadius: '7px' }}>
                      <AlertCircle size={15} style={{ flexShrink: 0 }} /> {slot.error}
                    </div>
                  )}

                  {/* Auto-filled Student Details Card */}
                  {slot.student && (
                    <div className="team-student-details-card" style={{
                      marginTop: '0.5rem',
                      background: 'rgba(34, 197, 94, 0.08)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <UserCheck size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.88rem' }}>
                            {slot.student.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                            Reg No: {slot.student.regNo} • Year {slot.student.year} • Email: {slot.student.email}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', background: '#22c55e', color: '#0b1120', padding: '0.15rem 0.45rem', borderRadius: '5px', fontWeight: '800', letterSpacing: '0.5px' }}>
                        VERIFIED
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#f87171',
            padding: '1.25rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.95rem'
          }}>
            <AlertCircle size={20} />
            <div>{formError}</div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitLoading || currentUserHasSubmittedSelectedEvent}
          style={{
            width: '100%',
            padding: '1.15rem',
            fontSize: '1.15rem',
            fontWeight: '800',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.6rem',
            marginTop: '1rem',
            opacity: currentUserHasSubmittedSelectedEvent ? 0.5 : 1,
            cursor: currentUserHasSubmittedSelectedEvent ? 'not-allowed' : 'pointer'
          }}
        >
          {submitLoading ? (
            'REGISTERING TEAM...'
          ) : currentUserHasSubmittedSelectedEvent ? (
            <>
              <AlertCircle size={22} /> TEAM REGISTRATION DISABLED (ALREADY SUBMITTED)
            </>
          ) : (
            <>
              <Sparkles size={22} /> REGISTER TEAM FOR {selectedEvent.shortName.toUpperCase()}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

