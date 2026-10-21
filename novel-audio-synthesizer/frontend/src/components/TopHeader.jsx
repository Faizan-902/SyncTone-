import React from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  IconSoundwave,
  IconUsers,
  IconSettings,
  IconUser,
  IconShield,
} from './icons';

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
    <header className="sticky top-0 z-40 bg-[var(--bg-surface)]/85 backdrop-blur-md border-b border-[var(--border-subtle)] transition-colors duration-250">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Breadcrumbs */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <button
            onClick={() => onNavigate('catalog')}
            className="flex items-center gap-2.5 group text-left outline-none flex-shrink-0"
            aria-label="SyncTone Home"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
              <IconSoundwave className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-[var(--text-main)] font-display">
                SyncTone
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-medium tracking-wide bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/15">
                Neural Multi-Voice
              </span>
            </div>
          </button>

          {/* Breadcrumb Navigation */}
          <nav className="hidden md:flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium min-w-0" aria-label="Breadcrumb">
            <span className="text-[var(--border-subtle)] font-light">/</span>
            <button
              onClick={() => onNavigate('catalog')}
              className={`hover:text-[var(--text-main)] transition flex-shrink-0 ${
                view === 'catalog' ? 'text-[var(--text-main)] font-semibold' : ''
              }`}
            >
              Library
            </button>
            {view !== 'catalog' && currentNovel && (
              <>
                <span className="text-[var(--border-subtle)] font-light">/</span>
                <button
                  onClick={() => onNavigate('details')}
                  className={`hover:text-[var(--text-main)] transition truncate max-w-[180px] ${
                    view === 'details' ? 'text-[var(--text-main)] font-semibold' : ''
                  }`}
                  title={currentNovel.title}
                >
                  {currentNovel.title}
                </button>
              </>
            )}
            {view === 'reader' && currentChapter && (
              <>
                <span className="text-[var(--border-subtle)] font-light">/</span>
                <span
                  className="text-[var(--text-main)] font-semibold truncate max-w-[200px]"
                  title={currentChapter.title}
                >
                  {currentChapter.title}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Cast Roster Toggle (active only in reader view) */}
          {view === 'reader' && (
            <button
              onClick={onToggleRoster}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all flex items-center gap-1.5 ${
                showRoster
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-subtle)] hover:border-[var(--border-focus)]'
              }`}
              aria-label="Toggle Cast Roster"
            >
              <IconUsers className="w-4 h-4" />
              <span className="hidden sm:inline">Cast Roster</span>
            </button>
          )}

          {/* Neural Engine Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)] transition"
            title="Neural Voices & Engines"
            aria-label="TTS Settings"
          >
            <IconSettings className="w-4 h-4" />
          </button>

          {/* User Session / Auth Trigger */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-[var(--border-subtle)]">
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase rounded-md bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                <IconShield className="w-3 h-3 text-indigo-400" />
                {role}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-rose-400 rounded-lg hover:bg-[var(--bg-card)] transition font-medium"
                title="Sign out of SyncTone"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-[var(--border-subtle)]">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition flex items-center gap-1.5"
              >
                <IconUser className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
