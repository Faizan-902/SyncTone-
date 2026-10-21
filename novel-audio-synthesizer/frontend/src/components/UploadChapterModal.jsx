import React, { useState } from 'react';
import { api, ApiError } from '../services/api';
import { IconPlus, IconX, IconBook } from './icons';

export default function UploadChapterModal({ isOpen, novel, onClose, onChapterUploaded }) {
  const [title, setTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !novel) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!text.trim()) {
      setError('Chapter text content is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim() || undefined,
        text: text.trim(),
        chapter_number: chapterNumber ? parseInt(chapterNumber, 10) : undefined,
      };

      const res = await api.novels.uploadChapter(novel.id, payload);
      if (res?.chapter) {
        if (onChapterUploaded) onChapterUploaded(res.chapter);
        onClose();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err.message || 'Failed to upload chapter');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2 font-display">
              <IconBook className="w-4 h-4 text-indigo-400" />
              <span>Upload Chapter to {novel.title}</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Prose text will be ingested with dialogue segmentation and character voice casting.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-lg"
            aria-label="Close"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 text-rose-400 text-xs rounded-xl border border-rose-500/20">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-1">
                Chapter Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 1: The Boy Who Lived"
                className="w-full px-3.5 py-2 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-1">
                Number (optional)
              </label>
              <input
                type="number"
                min="1"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(e.target.value)}
                placeholder="Auto"
                className="w-full px-3.5 py-2 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-1">
              Chapter Prose Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={9}
              placeholder="Paste raw chapter text... SyncTone automatically analyzes dialogue and narrative segments."
              required
              className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-indigo-500 font-serif leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[var(--bg-surface)] hover:border-indigo-500/50 border border-[var(--border-subtle)] text-[var(--text-main)] text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Uploading...' : 'Upload & Synthesize'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
