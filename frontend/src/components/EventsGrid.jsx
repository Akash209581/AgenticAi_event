import React, { useState } from 'react';
import {
  Code2, Briefcase, Sparkles, ArrowLeft,
  Brain, Zap, FileText, Mic, Bot, Users, Video, Music, HelpCircle,
  Lightbulb, Compass, Camera, Gift, Lock
} from 'lucide-react';
import EventDetailsView from './EventDetailsView';
import { getEventDetails } from '../data/eventsRulesData';
import { getAssetUrl } from '../config/api';

const categoriesData = [
  {
    id: 'technical',
    title: 'Technical',
    subtitle: 'High-octane coding, prompt battles & paper presentations',
    badge: '3 Events',
    image: '/images/Technical.avif',
    gradient: 'linear-gradient(145deg, rgba(14, 165, 233, 0.2), rgba(15, 23, 42, 0.95))',
    borderColor: '#00f0ff',
    glowColor: 'rgba(0, 240, 255, 0.4)',
    events: [
      {
        id: 'technical-1',
        num: '1',
        title: 'Agentic AI Hackathon',
        icon: Brain,
        image: '/images/event_hackathon_1786084020517.png',
        gradient: 'linear-gradient(135deg, #0ea5e9, #6366f1)'
      },
      {
        id: 'technical-2',
        num: '2',
        title: 'AI Prompt Combat',
        icon: Zap,
        image: '/images/event_prompt_1786084056457.png',
        gradient: 'linear-gradient(135deg, #38bdf8, #0284c7)'
      },
      {
        id: 'technical-3',
        num: '3',
        title: 'Paper / Poster Presentation',
        icon: FileText,
        image: '/images/event_paper_poster.png',
        gradient: 'linear-gradient(135deg, #0284c7, #1e40af)'
      }
    ]
  },
  {
    id: 'industry',
    title: 'Industry & Innovation',
    subtitle: 'Podcasts with leaders, AI agent expos & industry summits',
    badge: '3 Events',
    image: '/images/industrial.avif',
    gradient: 'linear-gradient(145deg, rgba(168, 85, 247, 0.2), rgba(15, 23, 42, 0.95))',
    borderColor: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.4)',
    events: [
      {
        id: 'industry-1',
        num: '1',
        title: 'Podcast with Industry Professionals',
        icon: Mic,
        image: '/images/event_podcast.png',
        gradient: 'linear-gradient(135deg, #a855f7, #ec4899)'
      },
      {
        id: 'industry-2',
        num: '2',
        title: 'AI Agents Expo',
        icon: Bot,
        image: '/images/event_expo.png',
        gradient: 'linear-gradient(135deg, #c084fc, #9333ea)'
      },
      {
        id: 'industry-3',
        num: '3',
        title: 'AI Summit - Industry Interaction',
        icon: Users,
        image: '/images/event_summit.png',
        gradient: 'linear-gradient(135deg, #e879f9, #7e22ce)'
      }
    ]
  },
  {
    id: 'creative',
    title: 'Creative',
    subtitle: 'Reels competition, AI music synthesis & interactive quiz',
    badge: '3 Events',
    image: '/images/creative.avif',
    gradient: 'linear-gradient(145deg, rgba(245, 158, 11, 0.2), rgba(15, 23, 42, 0.95))',
    borderColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    events: [
      {
        id: 'creative-1',
        num: '1',
        title: 'Reels Competition',
        icon: Video,
        image: '/images/event_reels.png',
        gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)'
      },
      {
        id: 'creative-2',
        num: '2',
        title: 'AI Musical Competition',
        icon: Music,
        image: '/images/event_musical.png',
        gradient: 'linear-gradient(135deg, #fbbf24, #d97706)'
      },
      {
        id: 'creative-3',
        num: '3',
        title: 'AI Quiz',
        icon: HelpCircle,
        image: '/images/event_quiz.png',
        gradient: 'linear-gradient(135deg, #f59e0b, #b45309)'
      }
    ]
  }
];

export default function EventsGrid({ onRegister, currentUser = null, onEnrollEvent, onSubmissionUpdate }) {
  // Parse initial route from window.location.pathname
  const parseRoute = () => {
    let parts = window.location.pathname.toLowerCase().split('/').filter(Boolean);
    if (parts[0] === 'aiday') parts = parts.slice(1);
    if (parts[0] === 'events' && parts[1]) {
      const cat = categoriesData.find(c => c.id === parts[1]);
      if (parts[2] && cat) {
        const slug = decodeURIComponent(parts[2]).trim();
        const ev = cat.events.find(e =>
          e.id === slug ||
          (e.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug ||
          slug.includes(e.id) ||
          (e.title || '').toLowerCase().includes(slug)
        );
        if (ev) {
          return { cat, detail: getEventDetails(cat.id, ev.id, ev.title) };
        }
        return { cat, detail: getEventDetails(cat.id, slug, slug) };
      }
      return { cat: cat || null, detail: null };
    }
    return { cat: null, detail: null };
  };

  const [selectedCategory, setSelectedCategory] = useState(() => parseRoute().cat);
  const [selectedEventDetail, setSelectedEventDetail] = useState(() => parseRoute().detail);

  React.useEffect(() => {
    const handlePopState = () => {
      const { cat, detail } = parseRoute();
      setSelectedCategory(cat);
      setSelectedEventDetail(detail);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle Event Detail View render
  if (selectedEventDetail) {
    return (
      <EventDetailsView
        event={selectedEventDetail}
        onBack={() => {
          setSelectedEventDetail(null);
          const backPath = selectedCategory ? `/events/${selectedCategory.id}` : '/events';
          window.history.pushState({}, '', backPath);
        }}
        onRegister={onRegister}
        currentUser={currentUser}
        onEnrollEvent={onEnrollEvent}
        onSubmissionUpdate={onSubmissionUpdate}
      />
    );
  }

  return (
    <section className="events-grid-section" id="events-section">
      {/* Category Header or Back Nav Header */}
      {!selectedCategory ? (
        <div className="events-section-header">
          <h2 className="events-main-heading">EVENTS & COMPETITIONS</h2>
          <div className="events-heading-line"></div>
        </div>
      ) : (
        <div className="events-sub-header">
          <button
            className="events-back-btn"
            onClick={() => {
              setSelectedCategory(null);
              window.history.pushState({}, '', '/events');
            }}
          >
            <ArrowLeft size={20} /> Back to Categories
          </button>
          <div className="events-category-title-wrap">
            <h2 className="events-main-heading" style={{ color: selectedCategory.borderColor }}>
              {selectedCategory.title}
            </h2>
            <div
              className="events-heading-line"
              style={{ background: `linear-gradient(90deg, transparent, ${selectedCategory.borderColor}, transparent)` }}
            ></div>
          </div>
        </div>
      )}

      {/* CATEGORY VIEW: PURE IMAGE CARDS */}
      {!selectedCategory ? (
        <>
          <div className="events-portrait-grid">
            {categoriesData.map((cat) => {
            return (
              <div
                key={cat.id}
                className="portrait-event-card"
                onClick={() => {
                  setSelectedCategory(cat);
                  window.history.pushState({}, '', `/events/${cat.id}`);
                }}
              >
                {/* Pure Image Container */}
                <div className="portrait-image-stage">
                  <img
                    src={getAssetUrl(cat.image)}
                    alt={cat.title}
                    className="portrait-card-img"
                  />
                  <div className="portrait-badge-overlay">
                    {cat.badge}
                  </div>
                </div>

                {/* Name displayed below the card */}
                <div className="portrait-card-footer">
                  <h3 className="portrait-card-title">{cat.title}</h3>
                </div>
              </div>
            );
          })}
        </div>

        {/* Beyond the 9 / Coming Soon section */}
        <div className="beyond-section">
          <div className="beyond-glow-border">
            <div className="beyond-header">
              <span className="beyond-badge">
                <Zap size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> BUT THAT'S NOT ALL...
              </span>
              <h2 className="beyond-main-title">BEYOND THE 9</h2>
              <p className="beyond-subtitle">More experiences are loading...</p>
              <div className="beyond-title-underline"></div>
            </div>

            <div className="beyond-cards-grid">
              <div className="beyond-card card-imagine">
                <div className="beyond-icon-wrap icon-imagine">
                  <Lightbulb size={28} />
                </div>
                <h4 className="beyond-card-title title-imagine">IMAGINE</h4>
                <p className="beyond-card-desc">Something that will challenge your creativity.</p>
              </div>

              <div className="beyond-card card-decode">
                <div className="beyond-icon-wrap icon-decode">
                  <Compass size={28} />
                </div>
                <h4 className="beyond-card-title title-decode">DECODE</h4>
                <p className="beyond-card-desc">Something that will test your instincts.</p>
              </div>

              <div className="beyond-card card-capture">
                <div className="beyond-icon-wrap icon-capture">
                  <Camera size={28} />
                </div>
                <h4 className="beyond-card-title title-capture">CAPTURE</h4>
                <p className="beyond-card-desc">Something worth remembering.</p>
              </div>

              <div className="beyond-card card-discover">
                <div className="beyond-icon-wrap icon-discover">
                  <Gift size={28} />
                </div>
                <h4 className="beyond-card-title title-discover">DISCOVER</h4>
                <p className="beyond-card-desc">Something you won't see coming.</p>
              </div>
            </div>

            <div className="beyond-footer">
              <div className="beyond-footer-text">
                <span className="eyes-emoji" style={{ marginRight: '6px' }}>👀</span>
                <strong>CAN YOU GUESS WHAT'S COMING?</strong>
              </div>
              <div className="beyond-footer-subtext">The countdown has begun.</div>
              <div className="revealing-soon-btn">
                <Lock size={16} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
                REVEALING SOON...
              </div>
            </div>
          </div>
        </div>
        </>
      ) : (
        /* SUB-EVENTS VIEW: PURE IMAGE CARDS */
        <div className="events-portrait-grid">
          {selectedCategory.events.map((ev) => {
            const IconComp = ev.icon;
            const slug = (ev.title || ev.cardTitle).toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return (
              <div
                key={ev.id}
                className="portrait-event-card sub-portrait-card"
                onClick={() => {
                  const detail = getEventDetails(selectedCategory.id, ev.id, ev.title);
                  window.history.pushState({}, '', `/events/${selectedCategory.id}/${slug}`);
                  setSelectedEventDetail(detail);
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Pure Image Container */}
                <div className="portrait-image-stage">
                  {(ev.image || getEventDetails(selectedCategory.id, ev.id, ev.title)?.image) ? (
                    <img
                      src={getAssetUrl(ev.image || getEventDetails(selectedCategory.id, ev.id, ev.title)?.image)}
                      alt={ev.title}
                      className="portrait-card-img"
                    />
                  ) : (
                    <div
                      className="portrait-banner-graphic"
                      style={{ background: ev.gradient }}
                    >
                      <div className="graphic-ring-base" style={{ borderColor: 'rgba(255,255,255,0.4)' }}>
                        <div className="center-beam-light"></div>
                      </div>
                      <div className="floating-icon-wrapper" style={{ color: '#ffffff' }}>
                        <IconComp size={56} className="cyber-icon-svg" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Name displayed below the card */}
                <div className="portrait-card-footer">
                  <h3 className="portrait-card-title">{ev.title}</h3>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}


