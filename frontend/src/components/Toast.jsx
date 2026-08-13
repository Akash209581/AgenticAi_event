import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Trophy, Users } from 'lucide-react';

// ─── Toast Types ───────────────────────────────────────────────────────────────
const TOAST_STYLES = {
  success: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(52, 211, 153, 0.5)',
    iconColor: '#34d399',
    titleColor: '#34d399',
    glow: 'rgba(52, 211, 153, 0.2)',
    Icon: CheckCircle2
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(248, 113, 113, 0.5)',
    iconColor: '#f87171',
    titleColor: '#f87171',
    glow: 'rgba(248, 113, 113, 0.2)',
    Icon: AlertCircle
  },
  info: {
    bg: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    iconColor: '#38bdf8',
    titleColor: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.2)',
    Icon: Info
  },
  team: {
    bg: 'rgba(168, 85, 247, 0.12)',
    border: '1px solid rgba(192, 132, 252, 0.5)',
    iconColor: '#c084fc',
    titleColor: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.2)',
    Icon: Users
  },
  award: {
    bg: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.5)',
    iconColor: '#fbbf24',
    titleColor: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.2)',
    Icon: Trophy
  }
};

// ─── Single Toast Item ─────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const Icon = style.Icon;

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onRemove(toast.id), 350);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 350);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        background: style.bg,
        border: style.border,
        borderRadius: '14px',
        padding: '0.9rem 1rem',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${style.glow}`,
        minWidth: '280px',
        maxWidth: '380px',
        position: 'relative',
        transform: visible && !leaving ? 'translateX(0) scale(1)' : 'translateX(110%) scale(0.95)',
        opacity: visible && !leaving ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
        cursor: 'default',
        pointerEvents: 'all'
      }}
    >
      {/* Icon */}
      <div style={{ flexShrink: 0, marginTop: '0.1rem' }}>
        <Icon size={20} color={style.iconColor} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{
            fontWeight: '700',
            fontSize: '0.88rem',
            color: style.titleColor,
            marginBottom: toast.message ? '0.2rem' : 0,
            lineHeight: '1.3'
          }}>
            {toast.title}
          </div>
        )}
        {toast.message && (
          <div style={{
            fontSize: '0.8rem',
            color: '#cbd5e1',
            lineHeight: '1.4',
            wordBreak: 'break-word'
          }}>
            {toast.message}
          </div>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          transition: 'color 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Toast Container ──────────────────────────────────────────────────────────
export function ToastContainer({ toasts, onRemove }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        alignItems: 'flex-end',
        pointerEvents: 'none'
      }}
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ─── useToast Hook ─────────────────────────────────────────────────────────────
let _toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++_toastCounter;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Convenience methods
  const toast = {
    success: (title, message, duration) => addToast({ type: 'success', title, message, duration }),
    error: (title, message, duration) => addToast({ type: 'error', title, message, duration }),
    info: (title, message, duration) => addToast({ type: 'info', title, message, duration }),
    team: (title, message, duration) => addToast({ type: 'team', title, message, duration }),
    award: (title, message, duration) => addToast({ type: 'award', title, message, duration }),
  };

  return { toasts, toast, removeToast };
}
