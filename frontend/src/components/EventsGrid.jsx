import React from 'react';
import { Mic, Bot, FileText, Brain, Video, Music, Users, Zap, HelpCircle } from 'lucide-react';

const eventsData = [
  {
    id: 1,
    title: "PODCAST WITH INDUSTRY PROFESSIONALS",
    bullets: ["Live Podcast", "AI Experts", "Industry Insights", "Career Guidance"],
    icon: Mic
  },
  {
    id: 2,
    title: "AI AGENTS EXPO",
    bullets: ["AI Agents", "Autonomous Systems", "Intelligent Automation", "Multi-Agent Collaboration"],
    icon: Bot
  },
  {
    id: 3,
    title: "PAPER / POSTER PRESENTATION",
    bullets: ["AI Research", "LLM Applications", "AI Innovations", "Emerging Technologies"],
    icon: FileText
  },
  {
    id: 4,
    title: "AGENTIC AI HACKATHON",
    bullets: ["Healthcare", "Agriculture", "Smart Cities", "Cyber Security", "AI Solutions"],
    icon: Brain
  },
  {
    id: 5,
    title: "REELS COMPETITION",
    bullets: ["Theme: AI for Society", "AI Generated Content", "Creative Storytelling"],
    icon: Video
  },
  {
    id: 6,
    title: "AI MUSICAL COMPETITION",
    bullets: ["AI Music", "AI Voice", "AI Composition", "AI Performance"],
    icon: Music
  },
  {
    id: 7,
    title: "AI SUMMIT – INDUSTRY INTERACTION",
    bullets: ["Keynote Sessions", "Startup Showcase", "Panel Discussion", "Networking"],
    icon: Users
  },
  {
    id: 8,
    title: "AI PROMPT COMBAT",
    bullets: ["Prompt Engineering", "Image Generation", "Coding", "Data Analysis", "Logical Reasoning"],
    icon: Zap
  },
  {
    id: 9,
    title: "AI QUIZ",
    bullets: ["Generative AI", "Machine Learning", "LLMs", "Agentic AI", "AI Trends"],
    icon: HelpCircle
  }
];

export default function EventsGrid() {
  return (
    <section className="events-grid-section" id="events-section">
      <div className="events-section-header">
        <h2 className="events-main-heading">FEATURED EVENTS & COMPETITIONS</h2>
        <div className="events-heading-line"></div>
      </div>

      <div className="events-3x3-grid">
        {eventsData.map((ev) => {
          const IconComp = ev.icon;
          return (
            <div key={ev.id} className="cyber-event-card">
              {/* Top Header Row with Number & Title */}
              <div className="card-top-header">
                <div className="event-num-box">{ev.id}</div>
                <h3 className="event-card-title">{ev.title}</h3>
              </div>

              {/* Main Content Row */}
              <div className="card-body-content">
                {/* Bullet Points */}
                <ul className="event-bullets-list">
                  {ev.bullets.map((b, i) => (
                    <li key={i}>
                      <span className="cyan-bullet">•</span> {b}
                    </li>
                  ))}
                </ul>

                {/* Graphic Visual Stage */}
                <div className="event-graphic-stage">
                  <div className="graphic-ring-base">
                    <div className="outer-glow-ring"></div>
                    <div className="inner-glow-ring"></div>
                    <div className="center-beam-light"></div>
                  </div>
                  <div className="floating-icon-wrapper">
                    <IconComp size={38} className="cyber-icon-svg" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
