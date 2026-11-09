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

export const Icon = React.memo(function Icon({ name, className = 'w-4 h-4', ...props }) {
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

  const themeLabel = theme === 'dark' ? 'Dark Stage' : 'Light Stage';

  return (
    <>
      {/* Desktop Left Rail (Noir Monochrome 72px Navigation) */}
      <aside
        className="hidden md:flex fixed top-0 left-0 bottom-0 w-[72px] z-50 flex-col items-center justify-between py-6 bg-[var(--bg-bar)] border-r border-[var(--border-subtle)] transition-colors duration-200"
        aria-label="Sidebar Navigation"
      >
        {/* Top: Brand Mark & Primary Navigation */}
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Logo Mark */}
          <button
            onClick={() => onNavigate('catalog')}
            className="group relative flex items-center justify-center w-10 h-10 rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-strong)] text-[var(--text-main)] hover:border-[var(--text-main)] active:scale-95 transition-all duration-100 ease-out cursor-pointer"
            title="SyncTone Home"
            aria-label="SyncTone Home"
          >
            <span className="w-3.5 h-3.5 bg-[var(--text-main)] inline-block" />
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-col items-center gap-2.5 w-full px-2" aria-label="Main Navigation">
            {/* Library / Catalog */}
            <button
              onClick={() => onNavigate('catalog')}
              className={`group relative flex items-center justify-center w-10 h-10 rounded-[1px] transition-all duration-100 ease-out active:scale-95 cursor-pointer border ${
                currentView === 'catalog'
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-sub)] border-[var(--border-subtle)] hover:text-[var(--text-main)] hover:border-[var(--border-strong)]'
              }`}
              title="Novel Library"
              aria-label="Novel Library"
            >
              <Icon name="book" className="w-4 h-4" />
            </button>

            {/* Studio / Add Novel (Writers & Admins) */}
            {isWriterOrAdmin && onOpenAddNovel && (
              <button
                onClick={onOpenAddNovel}
                onMouseEnter={preloadAddNovelModal}
                onFocus={preloadAddNovelModal}
                className="group relative flex items-center justify-center w-10 h-10 rounded-[1px] bg-[var(--bg-card)] text-[var(--text-sub)] border border-[var(--border-subtle)] hover:text-[var(--text-main)] hover:border-[var(--border-strong)] transition-all duration-100 ease-out active:scale-95 cursor-pointer"
                title="Create New Novel"
                aria-label="Create New Novel"
              >
                <Icon name="plus" className="w-4 h-4" />
              </button>
            )}

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              onMouseEnter={preloadSettingsModal}
              onFocus={preloadSettingsModal}
              className="group relative flex items-center justify-center w-10 h-10 rounded-[1px] bg-[var(--bg-card)] text-[var(--text-sub)] border border-[var(--border-subtle)] hover:text-[var(--text-main)] hover:border-[var(--border-strong)] transition-all duration-100 ease-out active:scale-95 cursor-pointer"
              title="Settings & Preferences"
              aria-label="Settings"
            >
              <Icon name="settings" className="w-4 h-4" />
            </button>
          </nav>
        </div>

        {/* Bottom Actions: Theme Switcher & Account Profile */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          {/* Theme Switcher */}
          <button
            onClick={cycleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-[1px] bg-[var(--bg-card)] text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all duration-100 ease-out active:scale-95 cursor-pointer"
            title={`Switch Theme (${themeLabel})`}
            aria-label="Switch theme"
            aria-pressed={theme === 'dark'}
          >
            <Icon name={theme === 'dark' ? 'moon' : 'sun'} className="w-4 h-4" />
          </button>

          {/* User Account / Sign In */}
          {isAuthenticated ? (
            <div className="relative group">
              <button
                onClick={logout}
                className="w-10 h-10 rounded-[1px] bg-[var(--accent)] flex items-center justify-center text-[var(--on-accent)] text-xs font-mono font-bold uppercase hover:opacity-90 active:scale-95 transition-all duration-100 ease-out cursor-pointer"
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
              className="w-10 h-10 rounded-[1px] bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--border-strong)] hover:border-[var(--text-main)] transition-all duration-100 ease-out active:scale-95 cursor-pointer"
              title="Sign in / Register"
              aria-label="Account / Sign In"
            >
              <Icon name="user" className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Hidden in Reader View for Immersive Reading) */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-[var(--bg-bar)] border-t border-[var(--border-subtle)] items-center justify-around px-4 ${
          currentView === 'reader' ? 'hidden' : 'flex'
        }`}
        aria-label="Mobile Navigation"
      >
        <button
          onClick={() => onNavigate('catalog')}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-mono uppercase tracking-wider transition-all duration-100 ease-out active:scale-95 ${
            currentView === 'catalog' ? 'text-[var(--text-main)] font-bold' : 'text-[var(--text-sub)]'
          }`}
          aria-label="Library"
        >
          <Icon name="book" className="w-4 h-4" />
          <span>Library</span>
        </button>

        {isWriterOrAdmin && onOpenAddNovel && (
          <button
            onClick={onOpenAddNovel}
            className="flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--text-sub)] hover:text-[var(--text-main)] transition-all duration-100 ease-out active:scale-95"
            aria-label="Add Novel"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>Studio</span>
          </button>
        )}

        <button
          onClick={cycleTheme}
          className="flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--text-sub)] hover:text-[var(--text-main)] transition-all duration-100 ease-out active:scale-95"
          aria-label="Switch theme"
          aria-pressed={theme === 'dark'}
          title={`Switch Theme (${themeLabel})`}
        >
          <Icon name={theme === 'dark' ? 'moon' : 'sun'} className="w-4 h-4" />
          <span className="capitalize">{theme}</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--text-sub)] hover:text-[var(--text-main)] transition-all duration-100 ease-out active:scale-95"
          aria-label="Settings"
        >
          <Icon name="settings" className="w-4 h-4" />
          <span>Settings</span>
        </button>

        {isAuthenticated ? (
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--text-sub)] hover:text-[var(--danger)] transition-all duration-100 ease-out active:scale-95"
            aria-label="Sign Out"
          >
            <span className="w-4 h-4 rounded-[1px] bg-[var(--accent)] text-[var(--on-accent)] text-[9px] font-mono flex items-center justify-center font-bold">
              {user?.username?.[0] || 'U'}
            </span>
            <span>Sign Out</span>
          </button>
        ) : (
          <button
            onClick={() => onOpenAuth('login')}
            className="flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--text-sub)] hover:text-[var(--text-main)] transition-all duration-100 ease-out active:scale-95"
            aria-label="Mobile Sign In"
          >
            <Icon name="user" className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        )}
      </nav>
    </>
  );
}
