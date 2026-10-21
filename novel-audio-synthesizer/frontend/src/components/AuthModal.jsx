import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  IconX,
  IconSoundwave,
  IconBook,
  IconMic,
  IconSparkles,
} from './icons';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-4xl bg-[var(--bg-card)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col md:flex-row transform transition-all animate-scaleUp"
      >
        {/* Left Side: Form */}
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
                className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
                  mode === 'login'
                    ? 'border-indigo-500 text-indigo-400'
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
                className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
                  mode === 'register'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="flex items-center justify-between mb-1">
              <h2 id="auth-modal-title" className="text-xl font-bold text-[var(--text-main)] font-display tracking-tight">
                {mode === 'login' ? 'Welcome Back' : 'Join SyncTone'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-xl hover:bg-[var(--bg-surface)] transition"
                aria-label="Close dialog"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-sub)] mb-5 font-serif leading-relaxed">
              {mode === 'login'
                ? 'Sign in to access your synchronized novel progress and voice preferences.'
                : 'Create an account to explore neural voice literature and publish original novels.'}
            </p>

            {displayError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {displayError}
              </div>
            )}

            {/* Form */}
            <form noValidate onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. synctone_reader"
                    required
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-1">
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
                  className="w-full px-3.5 py-2 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-1">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="reader">Reader (Listen & Read)</option>
                    <option value="writer">Author / Writer (Upload Novels & Manage Cast)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <span>{mode === 'login' ? 'Sign In to SyncTone' : 'Create Account'}</span>
                )}
              </button>
            </form>
          </div>

          {/* Guest Access CTA */}
          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-3 bg-[var(--bg-surface)] hover:border-indigo-500/50 border border-[var(--border-subtle)] rounded-xl text-xs font-semibold text-[var(--text-main)] transition"
            >
              Continue as Guest
            </button>
          </div>
        </div>

        {/* Right Side: Editorial Showcase */}
        <div className="hidden md:flex w-1/2 relative bg-[var(--bg-surface)] overflow-hidden flex-col justify-end p-8 text-white">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/60 via-slate-950 to-indigo-950/40" />

          <div className="relative z-10 bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-indigo-400 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <IconSparkles className="w-3.5 h-3.5" />
                <span>Neural Audio Platform</span>
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">24kHz Neural</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-[var(--text-main)] font-display">
                Multi-Voice Audio Synthesis
              </h3>
              <p className="text-xs text-indigo-300 font-serif">Dual-TTS Architecture</p>
            </div>

            <p className="text-xs text-[var(--text-sub)] leading-relaxed italic border-l-2 border-indigo-400 pl-3 font-serif">
              "Experience synchronized prose where character dialogue and narrative passages are brought to life by dedicated voices."
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] font-mono">
              <span>EdgeTTS & Kokoro Engine</span>
              <span className="text-emerald-400 font-semibold">60fps Sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
