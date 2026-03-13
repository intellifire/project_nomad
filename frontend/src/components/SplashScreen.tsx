/**
 * Splash Screen Component
 *
 * Branded welcome screen shown on app load.
 * Auth mode determines behavior:
 *   'none'   — click anywhere to enter
 *   'simple' — username input field
 *   'oauth'  — OAuth provider buttons (Phase 2)
 */

import { useState, useEffect, useCallback } from 'react';
import { version } from '../../package.json';

type AuthMode = 'none' | 'simple' | 'oauth';

function resolveAuthMode(): AuthMode {
  const mode = import.meta.env.VITE_AUTH_MODE;
  if (mode === 'none' || mode === 'simple' || mode === 'oauth') {
    return mode;
  }
  // Legacy fallback
  if (import.meta.env.VITE_SIMPLE_AUTH !== undefined) {
    console.warn('[Nomad] VITE_SIMPLE_AUTH is deprecated. Use VITE_AUTH_MODE=none|simple|oauth');
    return import.meta.env.VITE_SIMPLE_AUTH === 'true' ? 'simple' : 'none';
  }
  return 'none';
}

const AUTH_MODE = resolveAuthMode();
const STORAGE_KEY = 'nomad_username';

interface SplashScreenProps {
  onEnter: () => void;
}

export function SplashScreen({ onEnter }: SplashScreenProps) {
  const [username, setUsername] = useState('');

  // Load saved username from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setUsername(saved);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (AUTH_MODE === 'simple' && !username.trim()) {
      return; // Don't allow empty username when auth is required
    }
    // Save username to localStorage
    if (username.trim()) {
      localStorage.setItem(STORAGE_KEY, username.trim());
    }
    onEnter();
  }, [username, onEnter]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }, [handleSubmit]);

  const canEnter = AUTH_MODE !== 'simple' || username.trim().length > 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
      }}
    >
      {/* Logo */}
      <img
        src="/nomad-logo.png"
        alt="Project Nomad"
        style={{
          width: '200px',
          height: 'auto',
          marginBottom: '32px',
          borderRadius: '24px',
        }}
      />

      {/* Title */}
      <h1
        style={{
          color: '#ffffff',
          fontSize: '48px',
          fontWeight: 700,
          margin: '0 0 8px 0',
          textAlign: 'center',
        }}
      >
        Project Nomad
      </h1>

      {/* Subtitle */}
      <p
        style={{
          color: '#94a3b8',
          fontSize: '20px',
          margin: '0 0 32px 0',
          textAlign: 'center',
        }}
      >
        Fire Modeling System<br />
        v{version} (<a
          href="https://github.com/WISE-Developers/project_nomad/blob/main/CHANGES.md"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#60a5fa', textDecoration: 'underline' }}
        >changes</a>) <br />
        SAN Mode (Stand Alone Nomad)
      </p>

      {/* Username input (when simple auth enabled) */}
      {AUTH_MODE === 'simple' && (
        <div style={{ marginBottom: '24px', width: '280px' }}>
          <label
            htmlFor="username"
            style={{
              display: 'block',
              color: '#94a3b8',
              fontSize: '14px',
              marginBottom: '8px',
            }}
          >
            Enter your name to continue
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Your name"
            autoFocus
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              backgroundColor: '#1e293b',
              border: '2px solid #334155',
              borderRadius: '8px',
              color: '#ffffff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Enter button */}
      <button
        onClick={handleSubmit}
        disabled={!canEnter}
        style={{
          padding: '14px 48px',
          fontSize: '18px',
          fontWeight: 600,
          color: '#ffffff',
          backgroundColor: canEnter ? '#3b82f6' : '#475569',
          border: 'none',
          borderRadius: '8px',
          cursor: canEnter ? 'pointer' : 'not-allowed',
          transition: 'background-color 0.2s',
        }}
      >
        Enter
      </button>

      {/* Click anywhere hint when no auth */}
      {AUTH_MODE === 'none' && (
        <div
          style={{
            color: '#64748b',
            fontSize: '14px',
            marginTop: '16px',
            animation: 'pulse 2s infinite',
          }}
        >
          or click anywhere to enter
        </div>
      )}

      {/* Pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
}
