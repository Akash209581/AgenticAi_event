import React, { useState, useEffect } from 'react';
import './NavOverlay.css';

/**
 * NavOverlay Component
 * 
 * Dynamic navigation background overlay that adjusts appearance based on the current route.
 * - Home Page ('/'): Fully transparent and clear background.
 * - Other Pages: Semi-transparent dark tint (rgba(0, 0, 0, 0.5)) with background blur (10px).
 * - Smooth CSS transitions (0.3s ease) between route states.
 */
export default function NavOverlay({ activeTab }) {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const updatePath = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener('popstate', updatePath);
    // Observe state updates for single-page tab navigations
    const interval = setInterval(updatePath, 200);

    return () => {
      window.removeEventListener('popstate', updatePath);
      clearInterval(interval);
    };
  }, []);

  // Check if current route/tab is Home
  const isHome = pathname === '/' && (!activeTab || activeTab === 'home');

  return (
    <div
      className={`nav-overlay ${!isHome ? 'nav-overlay--dark' : ''}`}
      aria-hidden="true"
    />
  );
}
