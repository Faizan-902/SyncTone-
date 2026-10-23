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

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setRole('reader');
    setValidationError('');
    clearError();
    onClose();
  };

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (isOpen) {
      clearError();
      setValidationError('');
      setTimeout(() => emailInputRef.current?.focus(), 50);
    } else {
      setPassword('');
      setValidationError('');
    }
  }, [isOpen, mode, clearError]);

  // Handle ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose();
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
          handleClose();
        }
      } else {
        const res = await register(username.trim(), trimmedEmail, password, role);
        if (res.success) {
          handleClose();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = validationError || error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-scaleUp"
      >
        {/* Header Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setValidationError('');
              clearError();
            }}
            className={`flex-1 py-4 text-sm font-semibold transition-all border-b-2 ${
              mode === 'login'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
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
            className={`flex-1 py-4 text-sm font-semibold transition-all border-b-2 ${
              mode === 'register'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form noValidate onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="auth-modal-title" className="text-xl font-bold text-gray-900 tracking-tight">
              {mode === 'login' ? 'Welcome Back' : 'Join SyncTone'}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-gray-500">
            {mode === 'login'
              ? 'Enter your credentials to access your reading progress and catalog.'
              : 'Sign up to read, synthesize audio, and save your progress across devices.'}
          </p>

          {displayError && (
            <div className="p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-700 text-xs flex items-start gap-2 animate-shake">
              <span className="text-red-500 font-bold">⚠️</span>
              <span className="flex-1">{displayError}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. synctone_reader"
                required
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
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
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition outline-none"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Account Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition outline-none"
              >
                <option value="reader">Reader (Browse & Listen)</option>
                <option value="writer">Writer / Author (Upload Novels & Chapters)</option>
              </select>
              <p className="mt-1 text-[11px] text-gray-400">
                Writers can create novels and manage character voice assignments.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In to SyncTone' : 'Create Account'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
