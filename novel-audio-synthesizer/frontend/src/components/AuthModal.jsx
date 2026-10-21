import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const { login, register, error, clearError } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('reader');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalRef = useRef(null);
  const emailInputRef = useRef(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (isOpen) {
      clearError();
      setValidationError('');
      setTimeout(() => emailInputRef.current?.focus(), 50);
    }
  }, [isOpen, mode, clearError]);

  // Handle ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    clearError();

    // Client-side validations
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register') {
      const trimmedUser = username.trim();
      if (!trimmedUser || trimmedUser.length < 3 || trimmedUser.length > 50) {
        setValidationError('Username must be between 3 and 50 characters.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await login(trimmedEmail, password);
        if (res.success) {
          onClose();
        }
      } else {
        const res = await register(username.trim(), trimmedEmail, password, role);
        if (res.success) {
          onClose();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = validationError || error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      {/* 50/50 Split Modal Container (Unity Hub Style) */}
      <div
        ref={modalRef}
        className="w-full max-w-4xl bg-[var(--bg-card)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col md:flex-row transform transition-all animate-scaleUp"
      >
        {/* Left Side: Clean Credentials & Registration Form */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 md:p-10 flex flex-col justify-between space-y-6">
          <div>
            {/* Header Tabs */}
            <div className="flex border-b border-[var(--border-subtle)] mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setValidationError('');
                  clearError();
                }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                  mode === 'login'
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setValidationError('');
                  clearError();
                }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                  mode === 'register'
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="flex items-center justify-between mb-1">
              <h2 id="auth-modal-title" className="text-2xl font-black text-[var(--text-main)] font-display tracking-tight">
                {mode === 'login' ? 'Welcome Back' : 'Join SyncTone'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-xl hover:bg-[var(--bg-surface)] transition"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--text-sub)] mb-5">
              {mode === 'login'
                ? 'Enter your credentials to access your synthesized library and reading history.'
                : 'Create your account to read, customize character voices, and synthesize chapters.'}
            </p>

            {displayError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs flex items-start gap-2">
                <span className="font-bold">⚠️</span>
                <span className="flex-1">{displayError}</span>
              </div>
            )}

            {/* Form */}
            <form noValidate onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-sub)] uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. synctone_reader"
                    required
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-sub)] uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-sub)] uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition outline-none"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-sub)] uppercase tracking-wider mb-1">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition outline-none"
                  >
                    <option value="reader">Reader (Browse & Listen)</option>
                    <option value="writer">Writer / Author (Upload Novels & Chapters)</option>
                  </select>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Writers can upload novels and customize neural character voice assignments.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/30 disabled:opacity-50 transition flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <span>{mode === 'login' ? 'Sign In to SyncTone' : 'Create Account'}</span>
                )}
              </button>
            </form>
          </div>

          {/* Quick Guest Access / One-Click Demo CTA */}
          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-3 bg-[var(--bg-surface)] hover:border-brand-500 border border-[var(--border-subtle)] rounded-xl text-xs font-bold text-[var(--text-main)] transition flex items-center justify-center gap-2"
            >
              <span>🌐</span> Continue as Guest
            </button>
          </div>
        </div>

        {/* Right Side: Cinematic Dark Fantasy Showcase (Unity Hub Style) */}
        <div className="hidden md:flex w-1/2 relative bg-slate-950 overflow-hidden flex-col justify-end p-8 text-white">
          {/* Ambient Background Glow and Gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-950 via-slate-950 to-indigo-950 opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-500/20 via-transparent to-transparent" />

          {/* Synthesized Spotlight Card */}
          <div className="relative z-10 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                  Synthesized Spotlight
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">24kHz Edge Neural</span>
            </div>

            <div>
              <h3 className="text-lg font-black text-white font-serif">
                Harry Potter & The Philosopher's Stone
              </h3>
              <p className="text-xs text-brand-300 font-medium">Chapter 1 • 7 Neural Voices Active</p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-brand-500 pl-3 font-serif">
              "Mr. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly normal, thank you very much."
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span>Cast: Ryan Neural, Thomas, Libby, Arthur</span>
              <span className="text-amber-400 font-bold">Dual-TTS 4NF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
