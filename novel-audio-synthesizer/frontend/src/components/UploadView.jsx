import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { IconUpload } from './icons';

export default function UploadView({ onOpenUploadModal, onOpenAuth }) {
  const { isAuthenticated, isWriterOrAdmin } = useAuth();

  if (!isAuthenticated || !isWriterOrAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--text-main)]">
          <IconUpload className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold font-sans uppercase tracking-tight text-[var(--text-main)] mb-2">
          Author Publishing Portal
        </h2>
        <p className="text-xs text-[var(--text-sub)] font-mono mb-6 leading-relaxed">
          Publishing new novels and manuscripts requires an author or writer account. Please sign in or register as a writer to get started.
        </p>
        <button
          onClick={() => onOpenAuth?.('login')}
          className="boxed-btn-primary px-6 py-2.5 text-xs font-mono font-bold tracking-wider cursor-pointer"
        >
          Sign In as Writer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="p-8 rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--text-main)]">
          <IconUpload className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold font-sans uppercase tracking-tight text-[var(--text-main)]">
          Publish a Novel
        </h1>
        <p className="text-xs text-[var(--text-sub)] font-mono max-w-md mx-auto leading-relaxed">
          Import your manuscript in EPUB, MOBI, AZW3, FB2, PDF, or text format. Our dramatic audio studio prepares it with character dialogue separation.
        </p>
        <div className="pt-2">
          <button
            onClick={onOpenUploadModal}
            className="boxed-btn-primary px-6 py-3 text-xs font-mono font-bold tracking-wider inline-flex items-center gap-2 cursor-pointer"
          >
            <IconUpload className="w-4 h-4" />
            <span>Open Novel Studio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
