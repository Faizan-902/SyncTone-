import React, { useState } from 'react';
import { api, ApiError } from '../services/api';
import { IconPlus, IconX } from './icons';

export default function AddNovelModal({ isOpen, onClose, onNovelCreated }) {
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [channel, setChannel] = useState('verified');
  const [globalTone, setGlobalTone] = useState('Fantasy / British Dramatic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.novels.create({
        title: title.trim(),
        synopsis: synopsis.trim(),
        channel,
        global_tone: globalTone.trim(),
      });
      if (res?.novel) {
        if (onNovelCreated) onNovelCreated(res.novel);
        onClose();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err.message || 'Failed to create novel');
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
      <div className="w-full max-w-lg bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2 font-display">
            <IconPlus className="w-4 h-4 text-indigo-400" />
            <span>Publish New Novel</span>
          </h2>
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

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-1">
              Novel Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Chronicles of Aethelgard"
              required
              className="w-full px-3.5 py-2 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-1">
              Distribution Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-indigo-500"
            >
              <option value="verified">Verified Channel (Cast Synthesized)</option>
              <option value="community">Community Channel</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-1">
              Global Tone / Genre
            </label>
            <input
              type="text"
              value={globalTone}
              onChange={(e) => setGlobalTone(e.target.value)}
              placeholder="e.g. Victorian Mystery, British Dramatic, Cyberpunk"
              className="w-full px-3.5 py-2 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-1">
              Synopsis
            </label>
            <textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              rows={4}
              placeholder="Overview of the narrative, character dynamics, and setting..."
              className="w-full px-3.5 py-2 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-indigo-500 font-serif leading-relaxed"
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
              {isSubmitting ? 'Publishing...' : 'Publish Novel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
