import React from 'react';
import { useAuth } from '../hooks/useAuth';

export default function TopHeader({
  view,
  currentNovel,
  currentChapter,
  onNavigate,
  showRoster,
  onToggleRoster,
  onOpenSettings,
  onOpenAuth,
}) {
  const { user, role, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-surface)]/85 backdrop-blur-xl border-b border-[var(--border-subtle)] shadow-xs transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Breadcrumbs */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <button
            onClick={() => onNavigate('catalog')}
            className="flex items-center gap-2.5 group text-left outline-none flex-shrink-0"
            aria-label="SyncTone Home"
          >
            <span className="text-2xl transform group-hover:scale-110 transition duration-300">
              🎙️
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-[var(--text-main)] group-hover:text-brand-500 transition font-display">
                SyncTone
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 rounded-md border border-brand-500/20">
                Dual-TTS 4NF
              </span>
            </div>
          </button>

          {/* Breadcrumb Navigation */}
          <nav className="hidden md:flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium min-w-0" aria-label="Breadcrumb">
            <button
              onClick={() => onNavigate('catalog')}
              className={`hover:text-brand-500 transition flex-shrink-0 ${
                view === 'catalog' ? 'text-brand-500 font-bold' : ''
              }`}
            >
              Library
            </button>
            {view !== 'catalog' && currentNovel && (
              <>
                <span className="opacity-40">/</span>
                <button
                  onClick={() => onNavigate('details')}
                  className={`hover:text-brand-500 transition truncate max-w-[160px] ${
                    view === 'details' ? 'text-brand-500 font-bold' : ''
                  }`}
                  title={currentNovel.title}
                >
                  {currentNovel.title}
                </button>
              </>
            )}
            {view === 'reader' && currentChapter && (
              <>
                <span className="opacity-40">/</span>
                <span
                  className="text-[var(--text-main)] font-bold truncate max-w-[160px]"
                  title={currentChapter.title}
                >
                  {currentChapter.title}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Cast Roster Toggle (only in reader view) */}
          {view === 'reader' && (
            <button
              onClick={onToggleRoster}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 ${
                showRoster
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm shadow-brand-500/25'
                  : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-subtle)] hover:border-brand-500/50'
              }`}
              aria-label="Cast Roster"
            >
              <span>👥</span>
              <span className="hidden sm:inline">Cast Roster</span>
            </button>
          )}

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl hover:bg-[var(--bg-card)] transition"
            title="TTS Engines & Status"
            aria-label="TTS Settings"
          >
            ⚙️
          </button>

          {/* User Session State */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--border-subtle)]">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-[var(--text-main)]">{user.username}</div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-brand-500/10 text-brand-400">
                  {role}
                </span>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-rose-500 bg-[var(--bg-card)] hover:bg-rose-500/10 border border-[var(--border-subtle)] hover:border-rose-500/30 rounded-xl transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--border-subtle)]">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl shadow-sm shadow-brand-500/25 transition"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
