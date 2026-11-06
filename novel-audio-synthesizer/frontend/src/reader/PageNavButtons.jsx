import React from 'react';
import { IconChevronLeft, IconChevronRight } from '../components/icons';

/**
 * PageNavButtons Component
 * Renders the floating Prev / Next page chevrons.
 * In Phase 1, Agent C positions these inside the reserved gutter so they
 * never intersect or overlap the content box.
 */
export default function PageNavButtons({
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
  prevTitle = 'Previous Page (Left Arrow)',
  nextTitle = 'Next Page (Right Arrow)',
  className = '',
}) {
  return (
    <>
      {/* Left Navigation Chevron */}
      <button
        type="button"
        aria-label="Previous Page"
        onClick={onPrev}
        disabled={!canPrev}
        className={`fixed sm:absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] bg-[var(--glass-dock)] backdrop-blur-md border border-[var(--border-subtle)] hover:border-[var(--border-focus)] transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer shadow-xl group ${className}`}
        title={prevTitle}
      >
        <IconChevronLeft className="w-6 h-6 -ml-0.5 group-hover:-translate-x-0.5 transition-transform" />
      </button>

      {/* Right Navigation Chevron */}
      <button
        type="button"
        aria-label="Next Page"
        onClick={onNext}
        disabled={!canNext}
        className={`fixed sm:absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] bg-[var(--glass-dock)] backdrop-blur-md border border-[var(--border-subtle)] hover:border-[var(--border-focus)] transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer shadow-xl group ${className}`}
        title={nextTitle}
      >
        <IconChevronRight className="w-6 h-6 -mr-0.5 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </>
  );
}

