import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';

export default function EventCountdown({ onExploreEvents }) {
  // Target Event Date: 29th August 2026 at 08:30 AM IST
  const targetDate = new Date('2026-08-29T08:30:00');

  const calculateTimeLeft = useCallback(() => {
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();

    if (difference <= 0) {
      return { isLive: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      isLive: false,
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000)
    };
  }, []);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  const triggerCelebration = useCallback(() => {
    try {
      // Center burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f2fe', '#4facfe', '#ec4899', '#fef08a', '#a855f7']
      });

      // Left cannon
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#00f2fe', '#38bdf8', '#22c55e', '#ffffff']
      });

      // Right cannon
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#ec4899', '#f43f5e', '#fbbf24', '#ffffff']
      });
    } catch (err) {
      console.warn('Confetti effect error:', err);
    }
  }, []);

  // Update timer every second
  useEffect(() => {
    const initial = calculateTimeLeft();
    setTimeLeft(initial);

    // If already live on page load, trigger celebratory confetti
    if (initial.isLive) {
      const timer = setTimeout(() => {
        triggerCelebration();
      }, 500);
      return () => clearTimeout(timer);
    }

    const interval = setInterval(() => {
      const updated = calculateTimeLeft();
      setTimeLeft((prev) => {
        // Trigger celebratory confetti once when transitioning from countdown to live
        if (!prev.isLive && updated.isLive) {
          triggerCelebration();
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeLeft, triggerCelebration]);

  const formatNumber = (num) => String(num).padStart(2, '0');

  const handleButtonClick = (e) => {
    if (timeLeft.isLive) {
      triggerCelebration();
    }
    if (onExploreEvents) {
      onExploreEvents(e);
    }
  };

  return (
    <div className="countdown-single-wrapper">
      {/* GLOWING NEON CARD FRAME */}
      <div className={`hackathon-countdown-card ${timeLeft.isLive ? 'card-live-mode' : ''}`}>
        {/* Border spark dots */}
        <span className="spark-dot spark-top"></span>
        <span className="spark-dot spark-bottom"></span>
        <span className="spark-dot spark-left"></span>

        {/* Presenter Subtitle */}
        <div className="countdown-presenter-tag">
          <span className="cse-blink-text">CSE</span> PRESENTS...
        </div>

        {/* Clean Heading */}
        <h2 className="countdown-clean-title">
          Agentic AI Day-2026
        </h2>
        <p className="countdown-date-sub">
          29th August 2026 • 8:30 AM IST
        </p>

        {/* CONDITIONAL: LIVE NOW BANNER vs DIGITS ROW */}
        {timeLeft.isLive ? (
          <div
            className="countdown-live-banner"
            onClick={triggerCelebration}
            title="Click for celebratory confetti!"
          >
            <div className="live-badge-chip">
              <span className="live-radar-dot"></span>
              <span className="live-badge-text">EVENT IS LIVE NOW</span>
            </div>
            <h3 className="live-banner-headline">
              🎉 Event is LIVE Now! 🚀
            </h3>
            <p className="live-banner-sub">
              Agentic AI Day 2026 is officially underway! Explore all 11 live stages, challenges, and workshops.
            </p>
          </div>
        ) : (
          <div className="countdown-tiles-row">
            {/* Days */}
            <div className="tile-unit">
              <div className="digit-box">{formatNumber(timeLeft.days)}</div>
              <span className="tile-label">Days</span>
            </div>

            <div className="tile-colon">:</div>

            {/* Hours */}
            <div className="tile-unit">
              <div className="digit-box">{formatNumber(timeLeft.hours)}</div>
              <span className="tile-label">Hours</span>
            </div>

            <div className="tile-colon">:</div>

            {/* Minutes */}
            <div className="tile-unit">
              <div className="digit-box">{formatNumber(timeLeft.minutes)}</div>
              <span className="tile-label">Mins</span>
            </div>

            <div className="tile-colon">:</div>

            {/* Seconds */}
            <div className="tile-unit">
              <div className="digit-box active-sec-box">{formatNumber(timeLeft.seconds)}</div>
              <span className="tile-label">Secs</span>
            </div>
          </div>
        )}

        {/* Events Navigation Link/Button */}
        {onExploreEvents && (
          <div className="events-btn-wrapper">
            <button
              className={`events-hero-btn ${timeLeft.isLive ? 'live-hero-btn' : ''}`}
              onClick={handleButtonClick}
            >
              <span>{timeLeft.isLive ? '🔥 Join Event / View Live Stages' : 'Explore All 11 Events'}</span>
              <span className="bouncing-arrow">{timeLeft.isLive ? '➔' : '↓'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
