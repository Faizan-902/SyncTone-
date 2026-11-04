import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { IconUpload, IconBook, IconSparkles } from './icons';

export default function UploadView({ onOpenUploadModal, onOpenAuth }) {
  const { isAuthenticated, isWriterOrAdmin } = useAuth();

  if (!isAuthenticated || !isWriterOrAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-elevated)] border theme-border flex items-center justify-center text-[var(--accent-text)]">
          <IconUpload className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold theme-heading font-serif mb-2">Author Publishing Portal</h2>
        <p className="text-sm theme-muted mb-6">
          Publishing new novels and manuscripts requires an author or writer account. Please sign in or register as a writer to get started.
        </p>
        <button
          onClick={() => onOpenAuth?.('login')}
          className="px-6 py-2.5 rounded-xl bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-bold hover:bg-[var(--cta-primary-hover)] transition shadow-sm"
        >
          Sign In as Writer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="p-8 rounded-2xl theme-surface border theme-border shadow-sm text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent-text)]">
          <IconUpload className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold theme-heading font-serif mb-2">Publish a Novel</h1>
        <p className="text-sm theme-muted max-w-md mx-auto mb-6">
          Import your manuscript in EPUB, MOBI, AZW3, FB2, PDF, or text format. Our dramatic audio studio prepares it with character dialogue separation.
        </p>
        <button
          onClick={onOpenUploadModal}
          className="px-6 py-3 rounded-xl bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-sm font-bold hover:bg-[var(--cta-primary-hover)] transition shadow-md inline-flex items-center gap-2"
        >
          <IconUpload className="w-4 h-4" />
          <span>Open Novel Studio</span>
        </button>
      </div>
    </div>
  );
}

