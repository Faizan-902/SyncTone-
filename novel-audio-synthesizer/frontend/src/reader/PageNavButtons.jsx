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
        className={`fixed sm:absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-[1px] flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer shadow-md group ${className}`}
        title={prevTitle}
      >
        <IconChevronLeft className="w-5 h-5 -ml-0.5 group-hover:-translate-x-0.5 transition-transform" />
      </button>

      {/* Right Navigation Chevron */}
      <button
        type="button"
        aria-label="Next Page"
        onClick={onNext}
        disabled={!canNext}
        className={`fixed sm:absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-[1px] flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer shadow-md group ${className}`}
        title={nextTitle}
      >
        <IconChevronRight className="w-5 h-5 -mr-0.5 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </>
  );
}

