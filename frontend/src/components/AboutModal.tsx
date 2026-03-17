/**
 * About Modal
 *
 * Shows app info from package.json and a contributors list
 * with clickable GitHub profile links.
 */

import React from 'react';
import { version } from '../../package.json';

interface Contributor {
  name: string;
  github: string;
}

const CONTRIBUTORS: Contributor[] = [
  { name: 'Franco Nogarin', github: 'spydmobile' },
];

interface AboutModalProps {
  onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#1f2937',
  color: 'white',
  borderRadius: '12px',
  padding: '32px',
  width: 'calc(100% - 32px)',
  maxWidth: '420px',
  boxSizing: 'border-box',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  textAlign: 'center',
};

export function AboutModal({ onClose }: AboutModalProps) {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={modalStyle}>
        {/* Logo */}
        <img
          src="/nomad-logo.png"
          alt="Project Nomad"
          style={{ width: '80px', height: 'auto', borderRadius: '16px', marginBottom: '16px' }}
        />

        {/* Title */}
        <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 700 }}>
          Project Nomad
        </h2>
        <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#94a3b8' }}>
          Fire Modeling System
        </p>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>
          {__GIT_BRANCH__} &middot; v{version} &middot; AGPL-3.0 License
        </p>

        {/* Description */}
        <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 20px 0' }}>
          A map-based fire modeling GUI supporting FireSTARR probabilistic
          and deterministic fire growth simulations for Canadian wildfire management.
        </p>

        {/* Links */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
          <a
            href="https://github.com/WISE-Developers/project_nomad"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#60a5fa', fontSize: '13px', textDecoration: 'none' }}
          >
            <i className="fa-brands fa-github" style={{ marginRight: '6px' }} />
            GitHub
          </a>
          <a
            href="https://github.com/WISE-Developers/project_nomad/blob/main/CHANGES.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#60a5fa', fontSize: '13px', textDecoration: 'none' }}
          >
            <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '6px' }} />
            Changelog
          </a>
          <a
            href="https://github.com/WISE-Developers/project_nomad/issues/new/choose"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#60a5fa', fontSize: '13px', textDecoration: 'none' }}
          >
            <i className="fa-solid fa-bug" style={{ marginRight: '6px' }} />
            Report Issue
          </a>
        </div>

        {/* Contributors */}
        <div style={{ borderTop: '1px solid #374151', paddingTop: '16px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Source Code Contributors
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            {CONTRIBUTORS.map((c) => (
              <a
                key={c.github}
                href={`https://github.com/${c.github}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#e2e8f0',
                  textDecoration: 'none',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <img
                  src={`https://github.com/${c.github}.png?size=32`}
                  alt={c.name}
                  style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                />
                {c.name}
                <span style={{ color: '#64748b', fontSize: '12px' }}>@{c.github}</span>
              </a>
            ))}
          </div>
        </div>

        {/* OK button */}
        <button
          onClick={onClose}
          style={{
            padding: '10px 32px',
            fontSize: '14px',
            fontWeight: 600,
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
