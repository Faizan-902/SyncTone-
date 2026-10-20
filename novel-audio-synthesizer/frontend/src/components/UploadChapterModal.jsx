import React, { useState } from 'react';
import { api, ApiError } from '../services/api';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>➕</span> Upload Chapter to {novel.title}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Prose will be ingested into PostgreSQL & MongoDB with dialogue segmentation.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Chapter Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 1: The Boy Who Lived"
                className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Number (optional)
              </label>
              <input
                type="number"
                min="1"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(e.target.value)}
                placeholder="Auto"
                className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Chapter Prose Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste raw prose text here... The system will parse narration and quoted dialogues automatically."
              required
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-serif leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Uploading...' : 'Upload & Enqueue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
