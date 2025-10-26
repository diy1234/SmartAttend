import React, { useState } from 'react';

function InlineSVG({ className = 'w-12 h-12 inline-block', title = 'SmartAttend' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={title}
      style={{ display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#2b9af3" />
          <stop offset="100%" stopColor="#1b5fb4" />
        </linearGradient>
      </defs>
      {/* calendar-like rounded square */}
      <rect x="4" y="6" width="56" height="44" rx="6" fill="url(#g)" />
      {/* binding rings */}
      <rect x="12" y="2" width="6" height="6" rx="1" fill="#dbeefe" />
      <rect x="46" y="2" width="6" height="6" rx="1" fill="#dbeefe" />
      {/* face box (framing for recognition) */}
      <rect x="42" y="22" width="12" height="12" rx="1.5" fill="none" stroke="#fff" strokeWidth="1.6" />
      {/* smiley face */}
      <circle cx="24" cy="28" r="5" fill="#fff" opacity="0.08" />
      <circle cx="22" cy="27" r="0.9" fill="#fff" />
      <circle cx="26" cy="27" r="0.9" fill="#fff" />
      <path d="M21 31c1.2 1 2.8 1 4 0" stroke="#fff" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* digital text area */}
      <rect x="6" y="36" width="52" height="10" rx="2" fill="#071b2e" />
      <text x="32" y="43.5" fontFamily="monospace" fontSize="6" fill="#2bf6ff" fontWeight="700" textAnchor="middle">SMARTATTEND</text>
    </svg>
  );
}

export default function Logo({ className = 'w-12 h-12 inline-block', title = 'SmartAttend' }) {
  const [failed, setFailed] = useState(false);

  // if user supplied smartattend-logo.png in public/, prefer that image
  if (!failed) {
    return (
      // eslint-disable-next-line jsx-a11y/alt-text
      <img
        src="/smartattend-logo.png"
        className={className}
        alt={title}
        onError={() => setFailed(true)}
        style={{ display: 'block', objectFit: 'contain' }}
      />
    );
  }
  return <InlineSVG className={className} title={title} />;
}
