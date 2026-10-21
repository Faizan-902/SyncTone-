import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';

export default function SidebarNav({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenSettings,
  onOpenAddNovel,
}) {
  const { user, role, isAuthenticated, isWriterOrAdmin, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();

  const themeIcon = theme === 'dark' ? '🌙' : theme === 'sepia' ? '📜' : '☀️';
  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'sepia' ? 'Sepia' : 'Light';

  return (
    <>
      {/* Desktop Left Rail (OTT Fixed Navigation) */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-20 z-50 flex-col items-center justify-between py-6 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] backdrop-blur-xl shadow-2xl transition-colors duration-300">
        {/* Top: Brand Logo */}
        <div className="flex flex-col items-center gap-6">
          <button
            onClick={() => onNavigate('catalog')}
            className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-105 transition-all duration-300"
            title="SyncTone Home"
            aria-label="SyncTone Home"
          >
            <div className="w-full h-full bg-[var(--bg-surface)] rounded-[14px] flex items-center justify-center">
              <span className="text-2xl transform group-hover:scale-110 transition duration-300">🎙️</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[var(--bg-surface)]" />
          </button>

          {/* Nav Icons */}
          <nav className="flex flex-col items-center gap-3" aria-label="Main Navigation">
            {/* Library / Explore */}
            <button
              onClick={() => onNavigate('catalog')}
              className={`group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ${
                currentView === 'catalog'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
              }`}
              title="Novel Library"
              aria-label="Novel Library"
            >
              <span className="text-xl">📚</span>
              {currentView === 'catalog' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full" />
              )}
            </button>

            {/* Studio / Add Novel (Writers & Admins) */}
            {isWriterOrAdmin && onOpenAddNovel && (
              <button
                onClick={onOpenAddNovel}
                className="group relative flex items-center justify-center w-11 h-11 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-all duration-200"
                title="Create New Novel"
                aria-label="Create New Novel"
              >
                <span className="text-xl">➕</span>
              </button>
            )}

            {/* TTS Engine Settings */}
            <button
              onClick={onOpenSettings}
              className="group relative flex items-center justify-center w-11 h-11 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-all duration-200"
              title="TTS Engines & Status"
              aria-label="TTS Engines & Status"
            >
              <span className="text-xl">⚙️</span>
            </button>
          </nav>
        </div>

        {/* Bottom Actions: Theme Switcher + Auth Avatar */}
        <div className="flex flex-col items-center gap-4">
          {/* Tri-Theme Cycle Toggle */}
          <button
            onClick={cycleTheme}
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-lg hover:scale-105 hover:border-brand-500/50 transition-all duration-200"
            title={`Switch Theme (Current: ${themeLabel})`}
            aria-label={`Switch Theme: ${themeLabel}`}
          >
            <span>{themeIcon}</span>
          </button>

          {/* User Session Avatar / Sign In */}
          {isAuthenticated ? (
            <div className="relative group">
              <button
                onClick={logout}
                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm hover:scale-105 transition"
                title={`${user?.username} (${role}) — Click to Sign Out`}
                aria-label="User Account"
              >
                {user?.username?.[0] || 'U'}
              </button>
              <div className="absolute left-full ml-3 bottom-0 hidden group-hover:flex flex-col bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-2.5 rounded-xl shadow-xl w-36 text-xs z-50">
                <span className="font-bold text-[var(--text-main)] truncate">{user?.username}</span>
                <span className="text-[10px] text-brand-400 uppercase font-semibold">{role}</span>
                <button
                  onClick={logout}
                  className="mt-2 text-left text-rose-500 hover:text-rose-400 font-semibold"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth('login')}
              className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-brand-500 text-[var(--text-main)] flex items-center justify-center text-xs font-bold transition"
              title="User Account"
              aria-label="User Account"
            >
              👤
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] flex items-center justify-around px-4 z-40 transition-colors duration-300"
        aria-label="Mobile Navigation"
      >
        <button
          onClick={() => onNavigate('catalog')}
          className={`flex flex-col items-center gap-1 ${
            currentView === 'catalog' ? 'text-brand-500 font-bold' : 'text-[var(--text-muted)]'
          }`}
          aria-label="Library"
        >
          <span className="text-xl">📚</span>
          <span className="text-[10px]">Library</span>
        </button>

        {isWriterOrAdmin && onOpenAddNovel && (
          <button
            onClick={onOpenAddNovel}
            className="flex flex-col items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"
            aria-label="Create Novel"
          >
            <span className="text-xl">➕</span>
            <span className="text-[10px]">Create</span>
          </button>
        )}

        <button
          onClick={cycleTheme}
          className="flex flex-col items-center gap-1 text-[var(--text-muted)]"
          aria-label="Toggle Theme"
        >
          <span className="text-xl">{themeIcon}</span>
          <span className="text-[10px]">{themeLabel}</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-1 text-[var(--text-muted)]"
          aria-label="Settings"
        >
          <span className="text-xl">⚙️</span>
          <span className="text-[10px]">Engines</span>
        </button>

        {isAuthenticated ? (
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1 text-brand-400 font-bold"
            aria-label="Profile"
          >
            <span className="text-sm w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center uppercase">
              {user?.username?.[0] || 'U'}
            </span>
            <span className="text-[10px]">Out</span>
          </button>
        ) : (
          <button
            onClick={() => onOpenAuth('login')}
            className="flex flex-col items-center gap-1 text-brand-500 font-bold"
            aria-label="User Account"
          >
            <span className="text-xl">👤</span>
            <span className="text-[10px]">Account</span>
          </button>
        )}
      </nav>
    </>
  );
}
