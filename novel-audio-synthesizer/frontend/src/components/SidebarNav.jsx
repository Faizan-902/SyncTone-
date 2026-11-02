import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { preloadAuthModal, preloadAddNovelModal, preloadSettingsModal } from '../App';
import {
  IconSoundwave,
  IconBook,
  IconPlus,
  IconSettings,
  IconUser,
  IconMoon,
  IconSun,
  IconScroll,
} from './icons';

export const Icon = React.memo(function Icon({ name, className = 'w-5 h-5', ...props }) {
  switch (name) {
    case 'soundwave':
      return <IconSoundwave className={className} {...props} />;
    case 'book':
      return <IconBook className={className} {...props} />;
    case 'plus':
      return <IconPlus className={className} {...props} />;
    case 'settings':
      return <IconSettings className={className} {...props} />;
    case 'user':
      return <IconUser className={className} {...props} />;
    case 'moon':
      return <IconMoon className={className} {...props} />;
    case 'sun':
      return <IconSun className={className} {...props} />;
    case 'scroll':
      return <IconScroll className={className} {...props} />;
    default:
      return null;
  }
});

export default function SidebarNav({
  currentView,
  onNavigate,
  onOpenSettings,
  onOpenAuth,
  onOpenAddNovel,
}) {
  const { user, role, isAuthenticated, isWriterOrAdmin, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();

  const themeLabel = theme === 'dark' ? 'Midnight Listening' : 'Warm Editorial';

  return (
    <>
      {/* Desktop Left Rail (Editorial 72px Navigation) */}
      <aside
        className="hidden md:flex fixed top-0 left-0 bottom-0 w-[72px] z-50 flex-col items-center justify-between py-6 bg-[#3A2418] border-r border-[var(--border-subtle)] shadow-xl transition-colors duration-200"
        aria-label="Sidebar Navigation"
      >
        {/* Top: Brand Mark & Primary Navigation */}
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Logo Mark */}
          <button
            onClick={() => onNavigate('catalog')}
            className="group relative flex items-center justify-center w-11 h-11 rounded-xl bg-[#1A120E] border border-[#A88462]/30 text-[#A88462] shadow-md hover:scale-105 active:scale-95 transition-transform duration-100 ease-out"
            title="SyncTone Home"
            aria-label="SyncTone Home"
          >
            <Icon name="soundwave" className="w-5 h-5 text-[#A88462]" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--success)] border-2 border-[#3A2418]" />
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-col items-center gap-2 w-full px-2" aria-label="Main Navigation">
            {/* Library / Catalog */}
            <button
              onClick={() => onNavigate('catalog')}
              className={`group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-100 ease-out active:scale-95 ${
                currentView === 'catalog'
                  ? 'bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-sm'
                  : 'text-[#D5C4AE]/70 hover:text-[#D5C4AE] hover:bg-[#4A4A46]/40'
              }`}
              title="Novel Library"
              aria-label="Novel Library"
            >
              <Icon name="book" className="w-5 h-5" />
              {currentView === 'catalog' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[var(--cta-primary-text)] rounded-r-full" />
              )}
            </button>

            {/* Studio / Add Novel (Writers & Admins) */}
            {isWriterOrAdmin && onOpenAddNovel && (
              <button
                onClick={onOpenAddNovel}
                onMouseEnter={preloadAddNovelModal}
                onFocus={preloadAddNovelModal}
                className="group relative flex items-center justify-center w-11 h-11 rounded-xl text-[#D5C4AE]/70 hover:text-[#D5C4AE] hover:bg-[#4A4A46]/40 transition-all duration-100 ease-out active:scale-95 cursor-pointer"
                title="Create New Novel"
                aria-label="Create New Novel"
              >
                <Icon name="plus" className="w-5 h-5" />
              </button>
            )}

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              onMouseEnter={preloadSettingsModal}
              onFocus={preloadSettingsModal}
              className="group relative flex items-center justify-center w-11 h-11 rounded-xl text-[#D5C4AE]/70 hover:text-[#D5C4AE] hover:bg-[#4A4A46]/40 transition-all duration-100 ease-out active:scale-95 cursor-pointer"
              title="Settings & Preferences"
              aria-label="Settings"
            >
              <Icon name="settings" className="w-5 h-5" />
            </button>
          </nav>
        </div>

        {/* Bottom Actions: Theme Switcher & Account Profile */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          {/* Theme Switcher */}
          <button
            onClick={cycleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-[#D5C4AE]/70 hover:text-[#D5C4AE] hover:bg-[#4A4A46]/40 border border-transparent hover:border-[#A88462]/30 transition-all duration-100 ease-out active:scale-95"
            title={`Switch Theme (${themeLabel})`}
            aria-label="Switch theme"
            aria-pressed={theme === 'dark'}
          >
            <Icon name={theme === 'dark' ? 'moon' : 'sun'} className="w-5 h-5" />
          </button>

          {/* User Account / Sign In */}
          {isAuthenticated ? (
            <div className="relative group">
              <button
                onClick={logout}
                className="w-10 h-10 rounded-xl bg-[var(--cta-primary-bg)] flex items-center justify-center text-[var(--cta-primary-text)] text-xs font-bold uppercase shadow-sm hover:scale-105 active:scale-95 transition-transform duration-100 ease-out"
                title={`${user?.username} (${role}) — Click to sign out`}
                aria-label="User Account"
              >
                {user?.username?.[0] || 'U'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth('login')}
              onMouseEnter={preloadAuthModal}
              onFocus={preloadAuthModal}
              className="w-10 h-10 rounded-xl theme-card flex items-center justify-center theme-muted hover:text-[var(--text-main)] border hover:border-[var(--border-focus)] transition-all duration-100 ease-out active:scale-95"
              title="Sign in / Register"
              aria-label="Account / Sign In"
            >
              <Icon name="user" className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Hidden in Reader View for Immersive Reading) */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 theme-surface border-t items-center justify-around px-4 shadow-xl ${
          currentView === 'reader' ? 'hidden' : 'flex'
        }`}
        aria-label="Mobile Navigation"
      >
        <button
          onClick={() => onNavigate('catalog')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-all duration-100 ease-out active:scale-95 ${
            currentView === 'catalog' ? 'text-[var(--accent-text)] font-semibold' : 'theme-muted'
          }`}
          aria-label="Library"
        >
          <Icon name="book" className="w-5 h-5" />
          <span>Library</span>
        </button>

        {isWriterOrAdmin && onOpenAddNovel && (
          <button
            onClick={onOpenAddNovel}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium theme-muted hover:text-[var(--text-main)] transition-all duration-100 ease-out active:scale-95"
            aria-label="Add Novel"
          >
            <Icon name="plus" className="w-5 h-5" />
            <span>Studio</span>
          </button>
        )}

        <button
          onClick={cycleTheme}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium theme-muted hover:text-[var(--text-main)] transition-all duration-100 ease-out active:scale-95"
          aria-label="Switch theme"
          aria-pressed={theme === 'dark'}
          title={`Switch Theme (${themeLabel})`}
        >
          <Icon name={theme === 'dark' ? 'moon' : 'sun'} className="w-5 h-5" />
          <span className="capitalize">{theme}</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium theme-muted hover:text-[var(--text-main)] transition-all duration-100 ease-out active:scale-95"
          aria-label="Settings"
        >
          <Icon name="settings" className="w-5 h-5" />
          <span>Settings</span>
        </button>

        {isAuthenticated ? (
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium theme-muted hover:text-[var(--danger)] transition-all duration-100 ease-out active:scale-95"
            aria-label="Sign Out"
          >
            <span className="w-5 h-5 rounded-full bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-[10px] flex items-center justify-center font-bold">
              {user?.username?.[0] || 'U'}
            </span>
            <span>Sign Out</span>
          </button>
        ) : (
          <button
            onClick={() => onOpenAuth('login')}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium theme-muted hover:text-[var(--text-main)] transition-all duration-100 ease-out active:scale-95"
            aria-label="Mobile Sign In"
          >
            <Icon name="user" className="w-5 h-5" />
            <span>Sign In</span>
          </button>
        )}
      </nav>
    </>
  );
}
