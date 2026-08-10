import React, { useState, useEffect } from 'react';

export default function EventCountdown({ onExploreEvents }) {
  // Target Event Date: 29th August 2026 at 09:00 AM IST
  const targetDate = new Date('2026-08-29T09:00:00');

  const calculateTimeLeft = () => {
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000)
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num) => String(num).padStart(2, '0');

  return (
    <div className="countdown-single-wrapper">
      {/* GLOWING NEON CARD FRAME */}
      <div className="hackathon-countdown-card">
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
          Agentic Day-2026
        </h2>
        <p className="countdown-date-sub">29th August 2026</p>

        {/* DIGITS ROW */}
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

        {/* Events Navigation Link/Button if provided */}
        {onExploreEvents && (
          <div className="events-btn-wrapper">
            <button className="events-hero-btn" onClick={onExploreEvents}>
              <span>Explore All 9 Events</span>
              <span className="bouncing-arrow">↓</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
