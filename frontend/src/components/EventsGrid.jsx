import React, { useState } from 'react';
import {
  Code2, Briefcase, Sparkles, ArrowLeft,
  Brain, Zap, FileText, Mic, Bot, Users, Video, Music, HelpCircle
} from 'lucide-react';
import EventDetailsView from './EventDetailsView';
import { getEventDetails } from '../data/eventsRulesData';

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
        id: '1',
        num: '1',
        title: '1.) Agentic AI Hackthon',
        icon: Brain,
        image: '/images/event_hackathon_1786084020517.png',
        gradient: 'linear-gradient(135deg, #0ea5e9, #6366f1)'
      },
      {
        id: '2',
        num: '2',
        title: '2.) AI prompt combat',
        icon: Zap,
        image: '/images/event_prompt_1786084056457.png',
        gradient: 'linear-gradient(135deg, #38bdf8, #0284c7)'
      },
      {
        id: '3',
        num: '3',
        title: '3.) paper/poster presentation',
        icon: FileText,
        gradient: 'linear-gradient(135deg, #0284c7, #1e40af)'
      }
    ]
  },
  {
    id: 'industry',
    title: 'Industry & innovation',
    subtitle: 'Podcasts with leaders, AI agent expos & industry summits',
    badge: '3 Events',
    image: '/images/industrial.avif',
    gradient: 'linear-gradient(145deg, rgba(168, 85, 247, 0.2), rgba(15, 23, 42, 0.95))',
    borderColor: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.4)',
    events: [
      {
        id: '1',
        num: '1',
        title: '1.) podcast with industry proffesionals',
        icon: Mic,
        gradient: 'linear-gradient(135deg, #a855f7, #ec4899)'
      },
      {
        id: '2',
        num: '2',
        title: '2.) AI Agents expo',
        icon: Bot,
        gradient: 'linear-gradient(135deg, #c084fc, #9333ea)'
      },
      {
        id: '3',
        num: '3',
        title: '3.) AI summit-industry interaction',
        icon: Users,
        gradient: 'linear-gradient(135deg, #e879f9, #7e22ce)'
      }
    ]
  },
  {
    id: 'creative',
    title: 'creative',
    subtitle: 'Reels competition, AI music synthesis & interactive quiz',
    badge: '3 Events',
    image: '/images/creative.avif',
    gradient: 'linear-gradient(145deg, rgba(245, 158, 11, 0.2), rgba(15, 23, 42, 0.95))',
    borderColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    events: [
      {
        id: '1',
        num: '1',
        title: '1.) Reels competation',
        icon: Video,
        gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)'
      },
      {
        id: '2',
        num: '2',
        title: '2.) AI musical competation',
        icon: Music,
        gradient: 'linear-gradient(135deg, #fbbf24, #d97706)'
      },
      {
        id: '3',
        num: '3',
        title: '3.) AI Quiz',
        icon: HelpCircle,
        gradient: 'linear-gradient(135deg, #f59e0b, #b45309)'
      }
    ]
  }
];

export default function EventsGrid({ onRegister, currentUser = null, onEnrollEvent }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);

  // Handle Event Detail View render
  if (selectedEventDetail) {
    return (
      <EventDetailsView
        event={selectedEventDetail}
        onBack={() => setSelectedEventDetail(null)}
        onRegister={onRegister}
        currentUser={currentUser}
        onEnrollEvent={onEnrollEvent}
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
            onClick={() => setSelectedCategory(null)}
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
        <div className="events-portrait-grid">
          {categoriesData.map((cat) => {
            return (
              <div
                key={cat.id}
                className="portrait-event-card"
                onClick={() => setSelectedCategory(cat)}
              >
                {/* Pure Image Container */}
                <div className="portrait-image-stage">
                  <img
                    src={cat.image}
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
      ) : (
        /* SUB-EVENTS VIEW: PURE IMAGE CARDS */
        <div className="events-portrait-grid">
          {selectedCategory.events.map((ev) => {
            const IconComp = ev.icon;
            return (
              <div
                key={ev.id}
                className="portrait-event-card sub-portrait-card"
                onClick={() => {
                  const detail = getEventDetails(selectedCategory.id, ev.id, ev.title);
                  setSelectedEventDetail(detail);
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Pure Image Container */}
                <div className="portrait-image-stage">
                  {ev.image ? (
                    <img
                      src={ev.image}
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
                  <div className="click-rules-hint">Click to view rules & prizes →</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}


