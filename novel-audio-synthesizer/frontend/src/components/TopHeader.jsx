import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { preloadAuthModal, preloadSettingsModal, preloadCharacterRoster } from '../App';
import {
  IconSettings,
  IconShield,
  IconSyncToneLogo,
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
  onOpenAddNovel,
}) {
  const { user, role, isAuthenticated, isWriterOrAdmin, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-bar)] border-b border-[var(--border-subtle)] h-14 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-2 sm:px-8 h-full flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Primary Navigation Links */}
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          {/* Brand Logo */}
          <button
            onClick={() => onNavigate('catalog')}
            className="flex items-center gap-2.5 group text-left outline-none flex-shrink-0 cursor-pointer active:scale-95 transition-all duration-200"
            aria-label="SyncTone Home"
          >
            <div className="w-7 h-7 rounded-lg bg-[var(--text-main)] text-[var(--bg-page)] flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:shadow-md transition-all duration-200">
              <IconSyncToneLogo className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono font-bold tracking-[0.16em] uppercase text-[var(--text-main)] group-hover:opacity-90 transition-opacity">
              SYNCTONE
            </span>
          </button>

          {/* Monospace Editorial Nav Links */}
          <nav className="hidden sm:flex items-center gap-4 text-xs font-mono tracking-wider min-w-0" aria-label="Main Navigation">
            <button
              onClick={() => onNavigate('catalog')}
              className={`transition-colors py-1 cursor-pointer uppercase ${
                view === 'catalog'
                  ? 'text-[var(--text-main)] font-bold border-b border-[var(--text-main)]'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              + LIBRARY
            </button>
            <button
              onClick={() => {
                if (currentNovel?.id) onNavigate('details', currentNovel.id);
                else onNavigate('catalog');
              }}
              className={`transition-colors py-1 cursor-pointer uppercase ${
                view === 'details'
                  ? 'text-[var(--text-main)] font-bold border-b border-[var(--text-main)]'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              + ARCHIVE
            </button>
            <button
              onClick={() => {
                if (view === 'reader' && onToggleRoster) {
                  onToggleRoster();
                } else if (onNavigate) {
                  onNavigate('upload');
                }
              }}
              className={`transition-colors py-1 cursor-pointer uppercase ${
                showRoster || view === 'upload'
                  ? 'text-[var(--text-main)] font-bold border-b border-[var(--text-main)]'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              + VOICES
            </button>
            <button
              onClick={() => {
                if (currentChapter && onNavigate) onNavigate('reader');
                else if (currentNovel && onNavigate) onNavigate('details', currentNovel.id);
                else onNavigate('catalog');
              }}
              className={`transition-colors py-1 cursor-pointer uppercase ${
                view === 'reader'
                  ? 'text-[var(--text-main)] font-bold border-b border-[var(--text-main)]'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              + READER
            </button>
            {isWriterOrAdmin && onOpenAddNovel && (
              <button
                onClick={onOpenAddNovel}
                className="transition-colors py-1 cursor-pointer uppercase text-[var(--text-sub)] hover:text-[var(--text-main)]"
                title="Create New Novel"
              >
                + STUDIO
              </button>
            )}
          </nav>
        </div>

        {/* Right Action Controls: Cast Roster, Theme Toggle, Settings & Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Cast Roster Toggle (active only in reader view) */}
          {view === 'reader' && (
            <button
              onClick={onToggleRoster}
              onMouseEnter={preloadCharacterRoster}
              onFocus={preloadCharacterRoster}
              className={`boxed-btn px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-mono flex items-center gap-1 sm:gap-1.5 cursor-pointer active:scale-95 ${
                showRoster
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] font-bold'
                  : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-strong)] hover:border-[var(--text-main)]'
              }`}
              aria-label="Toggle Cast Roster"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span className="hidden sm:inline">Cast Roster</span>
              <span className="sm:hidden">Cast</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={cycleTheme}
            className="boxed-btn px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-mono uppercase text-[var(--text-sub)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border-[var(--border-strong)] hover:border-[var(--text-main)] flex items-center gap-1 sm:gap-1.5 cursor-pointer active:scale-95"
            title={`Switch Theme (currently ${theme})`}
            aria-label={`Switch Theme: ${theme.toUpperCase()}`}
            aria-pressed={theme === 'dark'}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span className="hidden sm:inline">THEME: </span>
            <span>{theme.toUpperCase()}</span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            onMouseEnter={preloadSettingsModal}
            onFocus={preloadSettingsModal}
            className="boxed-btn p-1.5 text-[var(--text-sub)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border-[var(--border-strong)] hover:border-[var(--text-main)] active:scale-95 cursor-pointer flex items-center justify-center min-w-[32px] min-h-[32px]"
            title="Settings & Preferences"
            aria-label="Settings"
          >
            <IconSettings className="w-3.5 h-3.5" />
          </button>

          {/* User Session / Auth Trigger */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--border-subtle)]">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-mono uppercase bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-sub)] rounded-full">
                <IconShield className="w-3 h-3 text-[var(--text-main)]" />
                {role}
              </span>
              <button
                onClick={logout}
                className="boxed-btn px-2.5 py-1 text-[11px] font-mono uppercase text-[var(--text-sub)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border-[var(--border-strong)] hover:border-[var(--text-main)] active:scale-95 cursor-pointer"
                title="Sign out of SyncTone"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-1 sm:pl-2 sm:border-l sm:border-[var(--border-subtle)]">
              <button
                onClick={() => onOpenAuth('login')}
                onMouseEnter={preloadAuthModal}
                onFocus={preloadAuthModal}
                className="boxed-btn-primary px-3 py-1 text-[11px] font-mono uppercase flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-none"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
