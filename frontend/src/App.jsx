import React, { useState, useEffect } from 'react';
import { Cpu, UserPlus, KeyRound, Sparkles, Home, ShieldCheck, Menu, X, Users } from 'lucide-react';
import RegistrationForm from './components/RegistrationForm';
import TeamRegistrationForm from './components/TeamRegistrationForm';
import UserProfile from './components/UserProfile';
import LoginPortal from './components/LoginPortal';
import AdminDashboard from './components/AdminDashboard';
import LoadingScreen from './components/LoadingScreen';
import EventCountdown from './components/EventCountdown';
import EventsGrid from './components/EventsGrid';
import NavOverlay from './components/NavOverlay';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/iamadmin' || path === '/cseadmin') return 'admin';
    if (path.startsWith('/events')) return 'events';
    if (path.startsWith('/register')) return 'register';
    if (path.startsWith('/team-register') || path.startsWith('/teams')) return 'team-register';
    if (path.startsWith('/login')) return 'login';
    if (path.startsWith('/profile')) return 'pass';
    return 'home';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vucse_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Sync currentUser changes to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('vucse_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('vucse_current_user');
    }
  }, [currentUser]);

  const [isNewRegistration, setIsNewRegistration] = useState(false);
  const [prefillLoginId, setPrefillLoginId] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/events')) setActiveTab('events');
      else if (path.startsWith('/register')) setActiveTab('register');
      else if (path.startsWith('/team-register') || path.startsWith('/teams')) setActiveTab('team-register');
      else if (path.startsWith('/login')) setActiveTab('login');
      else if (path.startsWith('/profile')) setActiveTab('pass');
      else if (path === '/iamadmin' || path === '/cseadmin') setActiveTab('admin');
      else setActiveTab('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  // Helper to change tab and sync browser URL
  const changeTab = (tabName, urlPath = '/') => {
    setActiveTab(tabName);
    setIsMobileMenuOpen(false);
    if (urlPath !== window.location.pathname) {
      window.history.pushState({}, '', urlPath);
    }
  };

  // Fetch total registration stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/cseAI/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setTotalCount(data.stats.totalRegistrations);
      }
    } catch (e) {
      console.warn('Stats fetch error:', e.message);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [currentUser]);

  const handleRegistrationSuccess = (user) => {
    setTotalCount(prev => prev + 1);
  };

  const handleProceedToLogin = (identifier) => {
    if (identifier) {
      setPrefillLoginId(identifier);
    }
    changeTab('login', '/');
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsNewRegistration(false);
    changeTab('pass');
  };

  const handleEnrollEvent = async (event) => {
    if (!currentUser) return;

    try {
      const response = await fetch('/cseAI/enroll-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: currentUser.aiId || currentUser.regNo || currentUser.email,
          event: {
            id: event.id,
            title: event.title,
            categoryName: event.categoryName || event.category,
            categoryId: event.categoryId,
            image: event.image
          }
        })
      });

      const data = await response.json();
      if (data.success && data.registeredEvents) {
        setCurrentUser(prev => ({
          ...prev,
          registeredEvents: data.registeredEvents
        }));
      }
    } catch (err) {
      console.warn('Failed to enroll event:', err);
      setCurrentUser(prev => {
        const existing = prev?.registeredEvents || [];
        if (existing.some(e => e.id === event.id || e.title === event.title)) return prev;
        return {
          ...prev,
          registeredEvents: [...existing, {
            id: event.id,
            title: event.title,
            categoryName: event.categoryName || event.category || 'TECHNICAL EVENTS',
            categoryId: event.categoryId || 'technical',
            image: event.image || ''
          }]
        };
      });
    }
  };

  const handleUnenrollEvent = async (eventId, eventTitle) => {
    if (!currentUser) return;

    try {
      const response = await fetch('/cseAI/unenroll-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: currentUser.aiId || currentUser.regNo || currentUser.email,
          eventId,
          eventTitle
        })
      });

      const data = await response.json();
      if (data.success && data.registeredEvents !== undefined) {
        setCurrentUser(prev => ({
          ...prev,
          registeredEvents: data.registeredEvents
        }));
      }
    } catch (err) {
      console.warn('Failed to unenroll event:', err);
      setCurrentUser(prev => ({
        ...prev,
        registeredEvents: (prev?.registeredEvents || []).filter(e => {
          if (eventId && e.id === eventId) return false;
          if (eventTitle && e.title.toLowerCase() === eventTitle.toLowerCase()) return false;
          return true;
        })
      }));
    }
  };

  const handleSubmissionUpdate = (updatedEvents) => {
    if (!currentUser || !Array.isArray(updatedEvents)) return;
    setCurrentUser(prev => ({
      ...prev,
      registeredEvents: updatedEvents
    }));
  };

  const leaveAdmin = () => {
    changeTab('home', '/');
  };


  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} minDuration={5000} />;
  }

  // Full Screen Admin Portal View
  if (activeTab === 'admin') {
    return <AdminDashboard onBack={leaveAdmin} />;
  }

  return (
    <div>
      {/* Background Route Overlay */}
      <NavOverlay activeTab={activeTab} />

      {/* Navbar Header */}
      <nav className="navbar">
        {/* Left Side: Brand Icon + Desktop CSE Badge + Mobile Title */}
        <div className="brand" onClick={() => changeTab('home', '/')}>
          <div className="brand-icon">
            <Cpu size={22} />
          </div>
          <span className="desktop-cse-badge blinking-cse-badge">CSE</span>
          <span className="mobile-brand-title">AGENTIC AI DAY - 2026</span>
        </div>

        {/* Center: AGENTIC AI DAY - 2026 (Desktop) */}
        <div className="navbar-center" onClick={() => changeTab('home', '/')}>
          <span className="brand-title-center">AGENTIC AI DAY - 2026</span>
        </div>

        {/* Mobile Right Controls: Blinking CSE + Hamburger Menu Toggle */}
        <div className="mobile-right-controls">
          <span className="mobile-cse-badge blinking-cse-badge">CSE</span>
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>


        <div className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
          <button
            className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => changeTab('home', '/')}
          >
            <Home size={18} /> Home
          </button>

          <button
            className={`nav-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => changeTab('events', '/events')}
          >
            <Sparkles size={18} /> Events
          </button>

          {currentUser && (
            <button
              className={`nav-btn ${activeTab === 'team-register' ? 'active' : ''}`}
              onClick={() => changeTab('team-register', '/team-register')}
            >
              <Users size={18} /> Team registrations
            </button>
          )}

          {!currentUser && (
            <button
              className={`nav-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => changeTab('register', '/register')}
            >
              <UserPlus size={18} /> Register / Signup
            </button>
          )}

          <button
            className={`nav-btn ${activeTab === 'login' || activeTab === 'pass' ? 'active' : ''}`}
            onClick={() => changeTab(currentUser ? 'pass' : 'login', currentUser ? '/profile' : '/login')}
          >
            <KeyRound size={18} /> {currentUser ? 'My Profile' : 'Login'}
          </button>
        </div>
      </nav>

      {/* Main Content View */}
      <main className="main-wrapper">
        {/* DASHBOARD VIEW: COUNTDOWN ONLY */}
        {activeTab === 'home' && (
          <EventCountdown onExploreEvents={() => changeTab('events', '/events')} />
        )}

        {/* EVENTS PAGE VIEW: 9 EVENT CARDS ONLY */}
        {activeTab === 'events' && (
          <EventsGrid
            onRegister={() => changeTab('register', '/register')}
            currentUser={currentUser}
            onEnrollEvent={handleEnrollEvent}
            onSubmissionUpdate={handleSubmissionUpdate}
          />
        )}

        {/* TEAM REGISTRATIONS VIEW (PROTECTED: LOGIN REQUIRED) */}
        {activeTab === 'team-register' && (
          currentUser ? (
            <TeamRegistrationForm
              currentUser={currentUser}
              onBack={() => changeTab('home', '/')}
              onSuccess={() => fetchStats()}
            />
          ) : (
            <LoginPortal
              initialIdentifier={prefillLoginId}
              onLoginSuccess={(user) => {
                setCurrentUser(user);
                setIsNewRegistration(false);
                changeTab('team-register', '/team-register');
              }}
              onBack={() => changeTab('home', '/')}
            />
          )
        )}


        {/* REGISTRATION / SIGNUP FORM VIEW */}
        {activeTab === 'register' && (
          currentUser ? (
            <UserProfile
              user={currentUser}
              onLogout={() => {
                setCurrentUser(null);
                changeTab('login', '/login');
              }}
              onExploreEvents={() => changeTab('events', '/events')}
              onUnenrollEvent={handleUnenrollEvent}
              onSubmissionUpdate={handleSubmissionUpdate}
            />
          ) : (
            <RegistrationForm
              onSuccess={handleRegistrationSuccess}
              onProceedToLogin={handleProceedToLogin}
              onBack={() => changeTab('home', '/')}
            />
          )
        )}

        {/* USER PROFILE & REGISTERED EVENTS VIEW */}
        {activeTab === 'pass' && (
          <div>
            {currentUser ? (
              <UserProfile
                user={currentUser}
                onLogout={() => {
                  setCurrentUser(null);
                  changeTab('login', '/login');
                }}
                onExploreEvents={() => changeTab('events', '/events')}
                onUnenrollEvent={handleUnenrollEvent}
                onSubmissionUpdate={handleSubmissionUpdate}
              />
            ) : (
              <LoginPortal
                initialIdentifier={prefillLoginId}
                onLoginSuccess={handleLoginSuccess}
                onBack={() => changeTab('home', '/')}
              />
            )}
          </div>
        )}

        {/* PASS LOGIN LOOKUP VIEW */}
        {activeTab === 'login' && (
          <LoginPortal
            initialIdentifier={prefillLoginId}
            onLoginSuccess={handleLoginSuccess}
            onBack={() => changeTab('home', '/')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div>Agentic AI Day 2026 • Computer Science & Engineering Department</div>
        <div style={{ marginTop: '0.4rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Base API: <code style={{ color: 'var(--primary-cyan)' }}>/cseAI</code> | Port: <code style={{ color: 'var(--primary-cyan)' }}>6007</code>
        </div>
      </footer>
    </div>
  );
}
