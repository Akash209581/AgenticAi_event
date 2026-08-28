import React, { useState, useEffect } from 'react';
import { 
  Bot, Sparkles, Brain, Cpu, Search, Filter, ExternalLink, 
  Github, Globe, Users, ArrowRight, Layers, ShieldAlert, 
  CheckCircle2, ListOrdered, ChevronLeft, ChevronRight, 
  Maximize2, Minimize2, Plus, Edit3, Award, Zap, Code, 
  HelpCircle, AlertTriangle, RefreshCw, ShieldCheck
} from 'lucide-react';
import { apiFetch } from '../config/api';
import { secureStorage } from '../utils/secureStorage';
import ProjectSubmissionModal from './ProjectSubmissionModal';

export default function AgentShowcaseDashboard({ currentUser, onNavigateToTeamRegister, onBack }) {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    hackathonCount: 0,
    expoCount: 0,
    liveDeployedCount: 0,
    totalMembersCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [activeEventTab, setActiveEventTab] = useState('ALL'); // 'ALL' | 'EXPO' | 'HACKATHON'
  const [selectedYear, setSelectedYear] = useState('ALL'); // 'ALL' | '1' | '2' | '3' | '4' | 'M.Tech'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Views
  const [selectedProject, setSelectedProject] = useState(null);
  const [isSlideDeckMode, setIsSlideDeckMode] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [teamAccessAlert, setTeamAccessAlert] = useState({ isOpen: false, title: '', message: '', type: 'login' });

  // Fetch Projects Data
  const loadShowcaseProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiFetch('/showcase-projects');
      if (data && data.success) {
        setProjects(data.projects || []);
        if (data.stats) setStats(data.stats);
      } else {
        setError(data?.message || 'Failed to load projects');
      }
    } catch (err) {
      console.error('Error fetching showcase projects:', err);
      setError('Unable to load showcase data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShowcaseProjects();
  }, []);

  const handleOpenProjectSubmission = () => {
    setIsSubmissionModalOpen(true);
  };

  // Filter Projects Locally
  const filteredProjects = projects.filter(p => {
    // Event Type Filter
    if (activeEventTab === 'EXPO') {
      const isExpo = (p.eventType || '').toLowerCase().includes('expo') || (p.eventTitle || '').toLowerCase().includes('expo');
      if (!isExpo) return false;
    } else if (activeEventTab === 'HACKATHON') {
      const isHack = (p.eventType || '').toLowerCase().includes('hackathon') || (p.eventTitle || '').toLowerCase().includes('hackathon');
      if (!isHack) return false;
    }

    // Year Filter
    if (selectedYear !== 'ALL') {
      const hasYear = p.members?.some(m => String(m.year).includes(selectedYear));
      if (!hasYear) return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchAgent = (p.projectDetails?.agentName || '').toLowerCase().includes(q);
      const matchProblem = (p.projectDetails?.problemStatement || '').toLowerCase().includes(q);
      const matchTools = (p.projectDetails?.toolsNeeded || '').toLowerCase().includes(q);
      const matchTeam = (p.teamName || '').toLowerCase().includes(q);
      const matchMember = p.members?.some(m => 
        (m.name || '').toLowerCase().includes(q) ||
        (m.regNo || '').toLowerCase().includes(q) ||
        (m.section || '').toLowerCase().includes(q)
      );

      if (!matchAgent && !matchProblem && !matchTools && !matchTeam && !matchMember) {
        return false;
      }
    }

    return true;
  });

  // Slide Deck Navigation Keyboard Handler
  useEffect(() => {
    if (!isSlideDeckMode) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlideIndex(prev => (prev < filteredProjects.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlideIndex(prev => (prev > 0 ? prev - 1 : filteredProjects.length - 1));
      } else if (e.key === 'Escape') {
        setIsSlideDeckMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSlideDeckMode, filteredProjects.length]);

  const handleOpenSlideDeck = (idx = 0) => {
    setCurrentSlideIndex(idx);
    setIsSlideDeckMode(true);
  };

  return (
    <div className="showcase-standalone-portal" style={{ minHeight: '100vh', background: '#050a18', color: '#fff' }}>
      
      {/* Standalone Showcase Top Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(11, 19, 41, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0, 242, 254, 0.25)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <img
            src="/images/cse logo.png"
            alt="CSE Logo"
            style={{
              height: '42px',
              width: 'auto',
              objectFit: 'contain',
              mixBlendMode: 'screen',
              filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.4))'
            }}
          />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>
              AGENTIC AI DAY 2026
            </div>
            <div style={{ fontSize: '0.75rem', color: '#00f2fe', fontWeight: 600 }}>
              AI Agent Expo & Hackathon Presentation Portal
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ← Back to Main Site
            </button>
          )}

          {secureStorage.getItem('vucse_admin_auth', true) === 'true' && (
            <a
              href="/iamadmin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                textDecoration: 'none',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
              }}
            >
              <ShieldCheck size={16} /> Admin Portal
            </a>
          )}

          <button
            onClick={handleOpenProjectSubmission}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
              border: 'none',
              color: '#050a18',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(0, 242, 254, 0.3)'
            }}
          >
            <Edit3 size={15} /> Submit My Project
          </button>
        </div>
      </header>

      <div className="showcase-container" style={{ maxWidth: '1350px', margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        
        {/* Top Banner & Header */}

      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
        border: '1px solid rgba(0, 242, 254, 0.35)',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        marginBottom: '2rem',
        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 242, 254, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Spheres */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(0, 242, 254, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-60px',
          left: '-60px',
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0, 242, 254, 0.12)', border: '1px solid rgba(0, 242, 254, 0.3)', padding: '0.4rem 0.9rem', borderRadius: '30px', color: '#00f2fe', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem' }}>
            <Sparkles size={15} /> DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.7rem)', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                AI Agent Expo & Hackathon <span style={{ color: 'transparent', background: 'linear-gradient(135deg, #00f2fe, #a855f7)', WebkitBackgroundClip: 'text' }}>Showcase</span>
              </h1>
              <p style={{ fontSize: '1rem', color: '#94a3b8', margin: 0, maxWidth: '700px', lineHeight: 1.6 }}>
                Explore autonomous AI agents, multi-agent frameworks, problem statements, real-world workflows, live deployments, and codebases developed by student engineering teams.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button
                onClick={handleOpenProjectSubmission}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                  border: 'none',
                  color: '#050a18',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 25px rgba(0, 242, 254, 0.4)',
                  transition: 'all 0.2s'
                }}
              >
                <Edit3 size={16} /> Submit / Edit My Project
              </button>

              {filteredProjects.length > 0 && (
                <button
                  onClick={() => handleOpenSlideDeck(0)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '12px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    color: '#c084fc',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Maximize2 size={16} /> Slide Presentation Mode
                </button>
              )}
            </div>
          </div>


          {/* Quick Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '1rem',
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '14px', padding: '1rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>Total AI Agents</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00f2fe', marginTop: '0.2rem' }}>{stats.totalProjects || projects.length}</div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '14px', padding: '1rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>⚡ Hackathon Projects</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc', marginTop: '0.2rem' }}>{stats.hackathonCount}</div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(236, 72, 153, 0.2)', borderRadius: '14px', padding: '1rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>🤖 AI Expo Prototypes</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f472b6', marginTop: '0.2rem' }}>{stats.expoCount}</div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '14px', padding: '1rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>🌐 Live Deployed</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ade80', marginTop: '0.2rem' }}>{stats.liveDeployedCount}</div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '14px', padding: '1rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>👥 Student Builders</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.2rem' }}>{stats.totalMembersCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Event Filter Tabs & Search & Year Filter */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.75rem',
        background: 'rgba(15, 23, 42, 0.7)',
        padding: '0.85rem 1.25rem',
        borderRadius: '18px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Projects', count: projects.length },
            { id: 'HACKATHON', label: '⚡ Agentic AI Hackathon', count: stats.hackathonCount },
            { id: 'EXPO', label: '🤖 AI Agents Expo', count: stats.expoCount }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveEventTab(tab.id)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                border: activeEventTab === tab.id ? '1px solid #00f2fe' : '1px solid rgba(255, 255, 255, 0.1)',
                background: activeEventTab === tab.id ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                color: activeEventTab === tab.id ? '#00f2fe' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              {tab.label}
              <span style={{
                background: activeEventTab === tab.id ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                padding: '0.1rem 0.45rem',
                borderRadius: '20px',
                fontSize: '0.75rem'
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Year Selectors */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '10px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Academic Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
            <option value="M.Tech">M.Tech</option>
          </select>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '350px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search agent, problem, tool, reg no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.25rem',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={loadShowcaseProjects}
            title="Refresh Showcase"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '0.55rem 0.75rem',
              color: '#cbd5e1',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
          <RefreshCw size={32} className="spin" style={{ color: '#00f2fe', marginBottom: '1rem' }} />
          <p>Loading AI Agent Showcase presentations...</p>
        </div>
      )}

      {error && !loading && (
        <div style={{
          padding: '1.5rem',
          borderRadius: '14px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          {error}
        </div>
      )}

      {/* Projects Cards Grid */}
      {!loading && (
        <>
          {filteredProjects.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4.5rem 2rem',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '24px',
              border: '1px dashed rgba(0, 242, 254, 0.25)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(0, 242, 254, 0.1)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                color: '#00f2fe'
              }}>
                <Bot size={32} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.6rem' }}>
                {projects.length === 0 ? 'No AI Agent Presentations Published Yet' : 'No AI Agents Match Your Filter'}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.92rem', maxWidth: '520px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
                {projects.length === 0 
                  ? 'Registered student teams for AI Agent Expo and Agentic AI Hackathon can publish their project presentation details using the button below.'
                  : 'No projects matched your search criteria. Try clearing your filters or submit a new project presentation!'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {projects.length > 0 && (
                  <button
                    onClick={() => {
                      setActiveEventTab('ALL');
                      setSelectedYear('ALL');
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '0.65rem 1.25rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#cbd5e1',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={handleOpenProjectSubmission}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                    border: 'none',
                    color: '#050a18',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 0 20px rgba(0, 242, 254, 0.35)'
                  }}
                >
                  <Edit3 size={16} /> Submit My Project Details
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '1.5rem'
            }}>
              {filteredProjects.map((project, idx) => {
                const isExpo = project.eventType === 'AI Agent Expo';
                const pd = project.projectDetails || {};
                const toolsList = (pd.toolsNeeded || '').split(',').map(t => t.trim()).filter(Boolean);

                return (
                  <div
                    key={project.id || idx}
                    className="cyber-card project-card"
                    style={{
                      background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.85))',
                      border: isExpo ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(0, 242, 254, 0.3)',
                      borderRadius: '20px',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {/* Event Type & Team Header */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.3rem 0.75rem',
                          borderRadius: '20px',
                          background: isExpo ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                          color: isExpo ? '#c084fc' : '#00f2fe',
                          border: isExpo ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(0, 242, 254, 0.4)'
                        }}>
                          {isExpo ? '🤖 AI AGENT EXPO' : '⚡ AGENTIC HACKATHON'}
                        </span>

                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                          {project.teamName}
                        </span>
                      </div>

                      {/* Agent Name */}
                      <h3 style={{
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        color: '#fff',
                        margin: '0 0 0.6rem 0',
                        lineHeight: 1.35
                      }}>
                        {pd.agentName || 'Untitled AI Agent Project'}
                      </h3>

                      {/* Problem Statement Snippet */}
                      <p style={{
                        fontSize: '0.88rem',
                        color: '#cbd5e1',
                        lineHeight: 1.55,
                        margin: '0 0 1rem 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {pd.problemStatement || 'Problem statement details pending submission.'}
                      </p>

                      {/* Tools Tags */}
                      {toolsList.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                          {toolsList.slice(0, 4).map((tool, tIdx) => (
                            <span
                              key={tIdx}
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.07)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#94a3b8'
                              }}
                            >
                              {tool}
                            </span>
                          ))}
                          {toolsList.length > 4 && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b', alignSelf: 'center' }}>
                              +{toolsList.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Team Members Chips */}
                      <div style={{
                        background: 'rgba(11, 19, 41, 0.6)',
                        borderRadius: '10px',
                        padding: '0.65rem 0.85rem',
                        marginBottom: '1.25rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Users size={13} /> Team Members ({project.members?.length || 0})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {(project.members || []).map((m, mIdx) => (
                            <span key={mIdx} style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 500 }}>
                              {m.name}
                              {m.section && <span style={{ color: '#00f2fe', fontSize: '0.72rem', marginLeft: '0.25rem' }}>({m.section})</span>}
                              {mIdx < (project.members?.length || 0) - 1 ? ' •' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '1rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {pd.githubLink && (
                          <a
                            href={pd.githubLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#cbd5e1',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              transition: 'all 0.2s'
                            }}
                            title="GitHub Repository"
                          >
                            <Github size={16} />
                          </a>
                        )}
                        {pd.demoLink && (
                          <a
                            href={pd.demoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              background: 'rgba(0, 242, 254, 0.15)',
                              color: '#00f2fe',
                              border: '1px solid rgba(0, 242, 254, 0.3)',
                              transition: 'all 0.2s'
                            }}
                            title="Live Deployment Demo"
                          >
                            <Globe size={16} />
                          </a>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedProject(project)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.55rem 1rem',
                          borderRadius: '10px',
                          background: isExpo ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                          border: isExpo ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(0, 242, 254, 0.4)',
                          color: isExpo ? '#c084fc' : '#00f2fe',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        View Presentation <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* DETAILED PROJECT PRESENTATION MODAL */}
      {selectedProject && (
        <div
          className="modal-backdrop show"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 10, 24, 0.88)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="cyber-modal-card"
            style={{
              background: 'linear-gradient(145deg, #0b1329, #0f1c3f)',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '1000px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 242, 254, 0.2)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Top Bar */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid rgba(0, 242, 254, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(11, 19, 41, 0.85)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  background: selectedProject.eventType === 'AI Agent Expo' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                  color: selectedProject.eventType === 'AI Agent Expo' ? '#c084fc' : '#00f2fe',
                  border: '1px solid currentColor'
                }}>
                  {selectedProject.eventType}
                </span>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                  Team: {selectedProject.teamName}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    const idx = filteredProjects.findIndex(p => p.id === selectedProject.id);
                    setSelectedProject(null);
                    handleOpenSlideDeck(idx >= 0 ? idx : 0);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(0, 242, 254, 0.15)',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    color: '#00f2fe',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <Maximize2 size={14} /> Slide Mode
                </button>

                <button
                  onClick={() => setSelectedProject(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0.45rem',
                    borderRadius: '8px'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Full Project Presentation Breakdown */}
            <div style={{
              padding: '1.75rem',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {/* Agent Title & External Actions */}
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '0 0 0.75rem 0' }}>
                  {selectedProject.projectDetails?.agentName || 'Agent Project Details'}
                </h2>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {selectedProject.projectDetails?.githubLink && (
                    <a
                      href={selectedProject.projectDetails.githubLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        fontSize: '0.82rem',
                        textDecoration: 'none'
                      }}
                    >
                      <Github size={15} /> GitHub Repository <ExternalLink size={12} />
                    </a>
                  )}

                  {selectedProject.projectDetails?.demoLink && (
                    <a
                      href={selectedProject.projectDetails.demoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(79, 172, 254, 0.2))',
                        border: '1px solid rgba(0, 242, 254, 0.4)',
                        color: '#00f2fe',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        textDecoration: 'none'
                      }}
                    >
                      <Globe size={15} /> Open Live Deployment <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Team Members Details Table */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1.25rem'
              }}>
                <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Users size={16} /> Team Engineers ({selectedProject.members?.length || 0})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {(selectedProject.members || []).map((m, idx) => (
                    <div key={idx} style={{ background: 'rgba(11, 19, 41, 0.8)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>{m.name} {m.isLeader && <span style={{ color: '#00f2fe', fontSize: '0.72rem' }}>(Lead)</span>}</div>
                      <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                        Reg: <strong style={{ color: '#cbd5e1' }}>{m.regNo}</strong> | Year {m.year} {m.section ? `(${m.section})` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 11 SPECIFICATIONS DETAILED BLOCKS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem' }}>
                
                {/* Block 1: Problem & Target Audience */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ color: '#00f2fe', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    What problem should it solve?
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                    {selectedProject.projectDetails?.problemStatement || 'Not provided'}
                  </p>

                  <div style={{ color: '#00f2fe', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    Who will use it? (Target Users)
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                    {selectedProject.projectDetails?.targetUsers || 'Not provided'}
                  </p>
                </div>

                {/* Block 2: Inputs & Information Used */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ color: '#c084fc', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    What will users give the agent? (Inputs)
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                    {selectedProject.projectDetails?.userInput || 'Not provided'}
                  </p>

                  <div style={{ color: '#c084fc', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    What information should it use? (Databases / Telemetry)
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                    {selectedProject.projectDetails?.informationUsed || 'Not provided'}
                  </p>
                </div>

                {/* Block 3: Decisions & Tools */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    What decisions should it make? (Autonomous Logic)
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                    {selectedProject.projectDetails?.decisionsMade || 'Not provided'}
                  </p>

                  <div style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    Which tools may be needed? (APIs / Frameworks)
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                    {selectedProject.projectDetails?.toolsNeeded || 'Not provided'}
                  </p>
                </div>

                {/* Block 4: Final Deliverable & Success Metric */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    What should the final result be?
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                    {selectedProject.projectDetails?.finalResult || 'Not provided'}
                  </p>

                  <div style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    How will you know it is useful? (Success Metrics)
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                    {selectedProject.projectDetails?.successMetrics || 'Not provided'}
                  </p>
                </div>
              </div>

              {/* Step-by-Step Execution Workflow (Full Width) */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                padding: '1.5rem',
                borderRadius: '14px',
                border: '1px solid rgba(0, 242, 254, 0.2)'
              }}>
                <div style={{ color: '#00f2fe', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ListOrdered size={18} /> Step-by-Step Agent Execution Pipeline
                </div>
                <div style={{
                  background: '#070d1e',
                  padding: '1rem 1.25rem',
                  borderRadius: '10px',
                  color: '#94a3b8',
                  fontFamily: 'monospace',
                  fontSize: '0.88rem',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedProject.projectDetails?.stepByStepWorkflow || 'Step by step execution pipeline not defined.'}
                </div>
              </div>

              {/* Failure Modes & Human Verification (Safety Alert Block) */}
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                padding: '1.25rem 1.5rem',
                borderRadius: '14px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}>
                <ShieldAlert size={22} style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ color: '#f87171', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    What can go wrong, and what should a person check? (Failure Modes & Human Verification)
                  </div>
                  <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                    {selectedProject.projectDetails?.failureModesAndChecks || 'Human verification checks pending disclosure.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PRESENTATION / SLIDE DECK MODE (For Projector / Evaluator Kiosk) */}
      {isSlideDeckMode && filteredProjects.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#050a18',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          color: '#fff',
          overflow: 'hidden'
        }}>
          {(() => {
            const currentProj = filteredProjects[currentSlideIndex] || filteredProjects[0];
            const pd = currentProj.projectDetails || {};
            const isExpo = currentProj.eventType === 'AI Agent Expo';

            return (
              <>
                {/* Slide Top Navigation Bar */}
                <div style={{
                  padding: '1rem 2rem',
                  background: 'rgba(15, 23, 42, 0.95)',
                  borderBottom: '1px solid rgba(0, 242, 254, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.85rem',
                      borderRadius: '20px',
                      background: isExpo ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 242, 254, 0.2)',
                      color: isExpo ? '#c084fc' : '#00f2fe',
                      border: '1px solid currentColor'
                    }}>
                      {currentProj.eventType}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>
                      Team: <strong style={{ color: '#fff' }}>{currentProj.teamName}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: '#00f2fe', fontSize: '0.85rem', fontWeight: 700 }}>
                      SLIDE {currentSlideIndex + 1} OF {filteredProjects.length}
                    </span>

                    <button
                      onClick={() => setCurrentSlideIndex(prev => (prev > 0 ? prev - 1 : filteredProjects.length - 1))}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: '#fff',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <button
                      onClick={() => setCurrentSlideIndex(prev => (prev < filteredProjects.length - 1 ? prev + 1 : 0))}
                      style={{
                        background: 'rgba(0, 242, 254, 0.2)',
                        border: '1px solid rgba(0, 242, 254, 0.4)',
                        color: '#00f2fe',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <ChevronRight size={18} />
                    </button>

                    <button
                      onClick={() => setIsSlideDeckMode(false)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#94a3b8',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Exit Presentation (Esc)
                    </button>
                  </div>
                </div>

                {/* Slide Body */}
                <div style={{
                  flex: 1,
                  padding: '2.5rem 3rem',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2rem',
                  maxWidth: '1400px',
                  margin: '0 auto',
                  width: '100%'
                }}>
                  {/* Hero Title & Problem Statement */}
                  <div>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff', margin: '0 0 0.75rem 0', lineHeight: 1.2 }}>
                      {pd.agentName || 'Agent Project Presentation'}
                    </h1>
                    <p style={{ fontSize: '1.2rem', color: '#00f2fe', fontWeight: 500, margin: '0 0 1.5rem 0' }}>
                      Problem: {pd.problemStatement}
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {pd.githubLink && (
                        <a href={pd.githubLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '10px', textDecoration: 'none' }}>
                          <Github size={16} /> GitHub Repo <ExternalLink size={14} />
                        </a>
                      )}
                      {pd.demoLink && (
                        <a href={pd.demoLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#050a18', background: 'linear-gradient(135deg, #00f2fe, #4facfe)', fontWeight: 'bold', padding: '0.5rem 1.25rem', borderRadius: '10px', textDecoration: 'none' }}>
                          <Globe size={16} /> Launch Live Demo <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 3 Column Presentation Breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                    {/* Column 1 */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <h3 style={{ color: '#00f2fe', fontSize: '1.05rem', margin: '0 0 0.5rem 0' }}>1. Target Users & Inputs</h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        <strong style={{ color: '#fff' }}>Users:</strong> {pd.targetUsers || 'N/A'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                        <strong style={{ color: '#fff' }}>Input Modalities:</strong> {pd.userInput || 'N/A'}
                      </p>
                    </div>

                    {/* Column 2 */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <h3 style={{ color: '#c084fc', fontSize: '1.05rem', margin: '0 0 0.5rem 0' }}>2. Data, Decisions & Tools</h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                        <strong style={{ color: '#fff' }}>Information:</strong> {pd.informationUsed || 'N/A'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                        <strong style={{ color: '#fff' }}>Decisions:</strong> {pd.decisionsMade || 'N/A'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                        <strong style={{ color: '#fff' }}>Tools:</strong> {pd.toolsNeeded || 'N/A'}
                      </p>
                    </div>

                    {/* Column 3 */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <h3 style={{ color: '#4ade80', fontSize: '1.05rem', margin: '0 0 0.5rem 0' }}>3. Output & Safety Checks</h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                        <strong style={{ color: '#fff' }}>Final Result:</strong> {pd.finalResult || 'N/A'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                        <strong style={{ color: '#fff' }}>Success Metric:</strong> {pd.successMetrics || 'N/A'}
                      </p>
                      <p style={{ color: '#f87171', fontSize: '0.85rem', margin: 0 }}>
                        <strong>Safety Check:</strong> {pd.failureModesAndChecks || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Execution Flow Pipeline */}
                  <div style={{ background: '#0a1024', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                    <h3 style={{ color: '#00f2fe', fontSize: '1rem', margin: '0 0 0.75rem 0' }}>Step-by-Step Agent Execution Workflow:</h3>
                    <pre style={{ margin: 0, color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                      {pd.stepByStepWorkflow}
                    </pre>
                  </div>

                  {/* Team Members Line */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#94a3b8', fontSize: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                    <strong style={{ color: '#fff' }}>Team Engineers:</strong>
                    {(currentProj.members || []).map((m, i) => (
                      <span key={i} style={{ color: '#cbd5e1' }}>
                        {m.name} ({m.regNo} - Year {m.year} {m.section ? `[${m.section}]` : ''}){i < (currentProj.members?.length || 0) - 1 ? ' • ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Team Project Submission Modal */}
      <ProjectSubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        currentUser={currentUser}
        onSuccess={() => {
          loadShowcaseProjects();
        }}
      />

      {/* Access Restriction Alert Modal */}
      {teamAccessAlert.isOpen && (
        <div
          className="modal-backdrop show"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 10, 24, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="cyber-modal-card"
            style={{
              background: 'linear-gradient(145deg, #0b1329, #0f1c3f)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '480px',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.2)'
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#f87171'
            }}>
              <ShieldAlert size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 0.6rem 0' }}>
              {teamAccessAlert.title}
            </h3>

            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
              {teamAccessAlert.message}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setTeamAccessAlert({ isOpen: false, title: '', message: '', type: 'login' })}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#94a3b8',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>

              {teamAccessAlert.type === 'register' && onNavigateToTeamRegister && (
                <button
                  onClick={() => {
                    setTeamAccessAlert({ isOpen: false, title: '', message: '', type: 'login' });
                    onNavigateToTeamRegister({ id: 'technical-1', title: 'AGENTIC AI HACKATHON', categoryId: 'technical' });
                  }}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                    border: 'none',
                    color: '#050a18',
                    fontWeight: 'bold',
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  Go to Team Registration →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}


