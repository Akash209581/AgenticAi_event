import React, { useState, useEffect } from 'react';
import { Cpu, UserPlus, KeyRound, Sparkles, Home } from 'lucide-react';
import RegistrationForm from './components/RegistrationForm';
import DigitalPass from './components/DigitalPass';
import LoginPortal from './components/LoginPortal';
import AdminDashboard from './components/AdminDashboard';
import LoadingScreen from './components/LoadingScreen';
import EventCountdown from './components/EventCountdown';
import EventsGrid from './components/EventsGrid';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() =>
    window.location.pathname === '/cseadmin' ? 'admin' : 'home'
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [isNewRegistration, setIsNewRegistration] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

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
    setCurrentUser(user);
    setIsNewRegistration(true);
    setActiveTab('pass');
    setTotalCount(prev => prev + 1);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsNewRegistration(false);
    setActiveTab('pass');
  };

  const leaveAdmin = () => {
    window.history.replaceState({}, '', '/');
    setActiveTab('home');
  };

  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} minDuration={5000} />;
  }

  return (
    <div>
      {/* Navbar Header */}
      <nav className="navbar">
        <div className="brand" onClick={() => setActiveTab('home')}>
          <div className="brand-icon">
            <Cpu size={22} />
          </div>
          AGENTIC AI DAY
        </div>

        <div className="nav-links">
          <button
            className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Home size={18} /> Home
          </button>

          <button
            className={`nav-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            <Sparkles size={18} /> Events
          </button>

          <button
            className={`nav-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            <UserPlus size={18} /> Register / Signup
          </button>

          <button
            className={`nav-btn ${activeTab === 'login' || activeTab === 'pass' ? 'active' : ''}`}
            onClick={() => setActiveTab(currentUser ? 'pass' : 'login')}
          >
            <KeyRound size={18} /> {currentUser ? 'My Digital Pass' : 'Login'}
          </button>
        </div>
      </nav>

      {/* Main Content View */}
      <main className="main-wrapper">
        {/* DASHBOARD VIEW: COUNTDOWN ONLY */}
        {activeTab === 'home' && (
          <EventCountdown onExploreEvents={() => setActiveTab('events')} />
        )}

        {/* EVENTS PAGE VIEW: 9 EVENT CARDS ONLY */}
        {activeTab === 'events' && (
          <EventsGrid />
        )}

        {/* REGISTRATION / SIGNUP FORM VIEW */}
        {activeTab === 'register' && (
          <RegistrationForm
            onSuccess={handleRegistrationSuccess}
            onBack={() => setActiveTab('home')}
          />
        )}

        {/* DIGITAL PASS VIEW */}
        {activeTab === 'pass' && (
          <div>
            {currentUser ? (
              <DigitalPass
                user={currentUser}
                isNew={isNewRegistration}
                onReset={() => {
                  setCurrentUser(null);
                  setIsNewRegistration(false);
                  setActiveTab('register');
                }}
              />
            ) : (
              <LoginPortal
                onLoginSuccess={handleLoginSuccess}
                onBack={() => setActiveTab('home')}
              />
            )}
          </div>
        )}

        {/* PASS LOGIN LOOKUP VIEW */}
        {activeTab === 'login' && (
          <LoginPortal
            onLoginSuccess={handleLoginSuccess}
            onBack={() => setActiveTab('home')}
          />
        )}

        {/* ADMIN DASHBOARD VIEW */}
        {activeTab === 'admin' && (
          <AdminDashboard onBack={leaveAdmin} />
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
