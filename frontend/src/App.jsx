import React, { useState, useEffect } from 'react';
import { Cpu, UserPlus, KeyRound, Sparkles, Home, ShieldCheck, Menu, X, Users } from 'lucide-react';
import { apiFetch, getAssetUrl } from './config/api';
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
  const getNormalizedPath = (pathname) => {
    const p = pathname.toLowerCase();
    if (p.startsWith('/aiday/')) return p.substring(6);
    if (p === '/aiday') return '/';
    return p;
  };

  const [activeTab, setActiveTab] = useState(() => {
    const path = getNormalizedPath(window.location.pathname);
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

  // Global Protection: Disable right-click, image dragging, text selection, and DevTools shortcuts (Ctrl+Shift+I, Ctrl+Shift+J)
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleDragStart = (e) => e.preventDefault();
    const handleSelectStart = (e) => {
      const tag = e.target?.tagName?.toUpperCase();
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e) => {
      const key = e.key ? e.key.toUpperCase() : '';
      const code = e.code ? e.code.toUpperCase() : '';
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, F12, Ctrl+U
      if (
        (isCtrlOrCmd && e.shiftKey && (key === 'I' || code === 'KEYI')) ||
        (isCtrlOrCmd && e.shiftKey && (key === 'J' || code === 'KEYJ')) ||
        (isCtrlOrCmd && e.shiftKey && (key === 'C' || code === 'KEYC')) ||
        (isCtrlOrCmd && (key === 'U' || code === 'KEYU')) ||
        key === 'F12' || code === 'F12'
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Sync browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = getNormalizedPath(window.location.pathname);
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
    const target = urlPath.startsWith('/') ? urlPath : '/' + urlPath;
    if (target !== window.location.pathname) {
      window.history.pushState({}, '', target);
    }
  };

  const fetchStats = async () => {
    try {
      const { res, data } = await apiFetch('/stats');
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
      const { response, data } = await apiFetch('/enroll-event', {
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
      if (data.success && data.registeredEvents) {
        setCurrentUser(prev => ({
          ...prev,
          registeredEvents: data.registeredEvents
        }));
      } else if (data.message) {
        alert(data.message);
      }
    } catch (err) {
      console.warn('Failed to enroll event:', err);
      alert(err.message || 'Unable to register for event. Registration deadline may have passed.');
    }
  };

  const handleUnenrollEvent = async (eventId, eventTitle) => {
    if (!currentUser) return;

    try {
      const { response, data } = await apiFetch('/unenroll-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: currentUser.aiId || currentUser.regNo || currentUser.email,
          eventId,
          eventTitle
        })
      });
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
      {/* Home Main Background */}
      <div className="home-background" />

      {/* Background Route Overlay */}
      <NavOverlay activeTab={activeTab} />

      {/* Navbar Header */}
      <nav className="navbar">
        {/* Left Side: CSE Logo Image + Mobile Title */}
        <div className="brand" onClick={() => changeTab('home', '/')}>
          <img
            src={getAssetUrl('/images/cse logo.png')}
            alt="CSE Logo"
            className="cse-header-logo-img"
            style={{
              height: '52px',
              width: 'auto',
              maxHeight: '100%',
              objectFit: 'contain',
              background: 'transparent',
              mixBlendMode: 'screen',
              filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.5))',
              cursor: 'pointer'
            }}
          />
          <span className="mobile-brand-title">AGENTIC DAY - 2026</span>
        </div>

        {/* Center: AGENTIC AI DAY - 2026 (Desktop) */}
        <div className="navbar-center" onClick={() => changeTab('home', '/')}>
          <span className="brand-title-center">AGENTIC AI DAY - 2026</span>
        </div>

        {/* Mobile Right Controls: Hamburger Menu Toggle */}
        <div className="mobile-right-controls">
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
