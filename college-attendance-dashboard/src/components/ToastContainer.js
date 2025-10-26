import React, { useContext } from 'react';
import ToastContext from '../context/ToastContext';

const ICONS = {
  info: 'ℹ️',
  success: '✅',
  error: '❌',
  warning: '⚠️',
};

const containerStyle = {
  position: 'fixed',
  top: 20,
  right: 20,
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const toastBase = (type) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  minWidth: 240,
  borderRadius: 8,
  backgroundColor: '#ffffff',
  color: '#000000',
  boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
  transform: 'translateY(-6px)',
  animation: 'toastIn 280ms ease forwards',
  borderLeft: `6px solid ${type === 'error' ? '#e53e3e' : type === 'success' ? '#38a169' : type === 'warning' ? '#d69e2e' : '#3182ce'}`,
});

export default function ToastContainer(){
  const { toasts, removeToast } = useContext(ToastContext);
  return (
    <div style={containerStyle} aria-live="polite" aria-atomic="true">
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      {toasts.map(t => (
        <div key={t.id} style={toastBase(t.type)}>
          <div style={{ fontSize: 18 }}>{ICONS[t.type] || ICONS.info}</div>
          <div style={{ flex: 1, color: '#000000' }}>{t.message}</div>
          <button onClick={() => removeToast(t.id)} style={{ marginLeft: 8, background: 'transparent', color: '#666666', border: 'none', cursor: 'pointer' }} aria-label="dismiss">✕</button>
        </div>
      ))}
    </div>
  );
}
