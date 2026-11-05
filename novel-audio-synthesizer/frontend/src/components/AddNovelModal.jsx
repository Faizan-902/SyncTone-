import React, { useState, useRef, useMemo, useEffect } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { api, ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { extractChaptersFromText, parseNovelFileClientSide } from '../utils/ebookParser';
import { sanitizeChaptersWithTtsDomCleaner } from '../utils/ttsSanitizer';
import {
  IconPlus,
  IconX,
  IconUser,
  IconUpload,
  IconPlay,
  IconCheck,
  IconBook,
  IconSparkles,
} from './icons';

export default function AddNovelModal({
  isOpen,
  onClose,
  onNovelCreated,
  onSelectChapter,
  onOpenAuth,
  initialParserEngine,
}) {
  const { user, isAuthenticated, isWriterOrAdmin, login, register } = useAuth();
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [channel, setChannel] = useState('verified');
  const [globalTone, setGlobalTone] = useState('Fantasy / British Dramatic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState(null);

  // File Dropzone & Extraction state
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null); // { name, size, format, chapterCount }
  const [coverObject, setCoverObject] = useState(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [rawParsedChapters, setRawParsedChapters] = useState([]); // [{ chapter_number, title, raw_text, segments? }]
  const [parsedCharacters, setParsedCharacters] = useState([]);
  const [parserEngine, setParserEngine] = useState(() => {
    try {
      return (
        initialParserEngine ||
        (typeof window !== 'undefined' && localStorage.getItem('synctone_parser_engine')) ||
        'heuristic'
      );
    } catch (_) {
      return initialParserEngine || 'heuristic';
    }
  }); // 'heuristic' | 'gemini' | 'unlimited-ocr'
  const [useTtsSanitizer, setUseTtsSanitizer] = useState(false);

  const parsedChapters = useMemo(
    () => (useTtsSanitizer ? sanitizeChaptersWithTtsDomCleaner(rawParsedChapters) : rawParsedChapters),
    [rawParsedChapters, useTtsSanitizer]
  );

  const [previewOpen, setPreviewOpen] = useState(false);

  const fileInputRef = useRef(null);
  const customCoverInputRef = useRef(null);
  const triggerRef = useRef(null);
  const prefersReduced = useReducedMotion();

  const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const panelVariants = prefersReduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } };

  // Store trigger element when modal opens; restore focus on close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    }
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape') { onClose(); if (triggerRef.current) triggerRef.current.focus(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Convert File to Base64 data string
  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = typeof result === 'string' ? result.split(',')[1] || result : '';
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

  // Read File as plain text string
  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || '');
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });

  // Handle author custom cover upload
  const handleCustomCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.novels.uploadAsset(formData);
      if (res?.url) {
        setCoverObject(res.url);
      }
    } catch (err) {
      console.error('[Upload Cover Error]:', err);
      setError('Failed to upload custom cover image: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploadingCover(false);
      if (customCoverInputRef.current) customCoverInputRef.current.value = '';
    }
  };

  // Process dropped or selected novel file
  const processFile = async (file) => {
    if (!file) return;
    setIsParsingFile(true);
    setError(null);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const formatBadge = ext.toUpperCase() || 'FILE';
    const cleanTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());

    try {
      let parsedResult = null;

      // Strategy 0: Direct client-side parsing (foliate-js / pdfjs-dist) when parserEngine === 'heuristic'
      const clientSideFormats = ['epub', 'mobi', 'azw3', 'kf8', 'fb2', 'fbz', 'pdf'];
      if (parserEngine === 'heuristic' && clientSideFormats.includes(ext)) {
        try {
          parsedResult = await parseNovelFileClientSide(file, {
            uploadAsset: api.novels.uploadAsset,
          });
        } catch (clientErr) {
          console.warn('[Client-Side parseNovelFileClientSide Notice]:', clientErr);
        }
      }

      // If client-side didn't handle it or parserEngine is AI (gemini/unlimited-ocr), use backend parser
      if (!parsedResult || !parsedResult.chapters || parsedResult.chapters.length === 0) {
        // Strategy 1: Fast Multipart FormData stream to backend parser
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('parser_engine', parserEngine);
          parsedResult = await api.novels.parseFile(formData, parserEngine);
        } catch (uploadErr) {
          console.warn('[Upload Parse API Warning]:', uploadErr);
          // Strategy 2: If multipart failed (e.g. proxy issue), try base64 fallback for files < 50MB
          if (file.size < 50 * 1024 * 1024) {
            try {
              const base64 = await readFileAsBase64(file);
              parsedResult = await api.novels.parseFile(
                {
                  file_name: file.name,
                  file_base64: base64,
                  parser_engine: parserEngine,
                },
                parserEngine
              );
            } catch (b64Err) {
              console.error('[Base64 Parse Fallback Error]:', b64Err);
            }
          }
        }

        // Strategy 2.5: Fallback to client-side parsing if backend parsing fails or returns no chapters
        if (!parsedResult || !parsedResult.chapters || parsedResult.chapters.length === 0) {
          try {
            parsedResult = await parseNovelFileClientSide(file, {
              uploadAsset: api.novels.uploadAsset,
            });
          } catch (clientErr) {
            console.warn('[Client-Side Fallback Parse Notice]:', clientErr);
          }
        }
      }

      // Check if backend or client-side returned parsed chapters
      if (parsedResult && parsedResult.chapters && parsedResult.chapters.length > 0) {
        const resolvedTitle = parsedResult.title || cleanTitle;
        const resolvedSynopsis = parsedResult.synopsis || `Imported from ${file.name}. Contains ${parsedResult.chapters.length} chapters ready for playback.`;

        setTitle(resolvedTitle);
        setSynopsis(resolvedSynopsis);
        setCoverObject(parsedResult.cover_object || null);
        setRawParsedChapters(parsedResult.chapters);
        setParsedCharacters(Array.isArray(parsedResult.characters) ? parsedResult.characters : []);
        setUploadedFile({
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          format: formatBadge,
          chapterCount: parsedResult.chapters.length,
          parserEngine: parsedResult.parser_engine || parserEngine,
        });
        return;
      }

      // Strategy 3: Client-side parsing for plain text documents (.txt, .md, .html)
      if (['txt', 'md', 'html', 'htm'].includes(ext)) {
        let textContent = '';
        try {
          textContent = await readFileAsText(file);
        } catch (_) {}

        if (textContent && textContent.trim()) {
          const chapters = extractChaptersFromText(textContent, cleanTitle);
          if (chapters && chapters.length > 0) {
            setTitle(cleanTitle);
            setSynopsis(textContent.slice(0, 200).trim() + '...');
            setRawParsedChapters(chapters);
            setUploadedFile({
              name: file.name,
              size: `${(file.size / 1024).toFixed(1)} KB`,
              format: formatBadge,
              chapterCount: chapters.length,
            });
            return;
          }
        }
      }

      // If we got here, parsing failed — report real error rather than generating 3 dummy lines!
      throw new Error(
        `Could not extract readable chapters from "${file.name}". Please ensure the file is a valid EPUB, MOBI, AZW3, FB2, PDF, or text novel.`
      );
    } catch (err) {
      setError('Failed to parse novel file: ' + (err.message || 'Unknown error'));
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFile(droppedFiles[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFile(selectedFiles[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setCoverObject(null);
    setRawParsedChapters([]);
    setParsedCharacters([]);
    setPreviewOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDemoLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const res = await login('demo_author@synctone.internal', 'DemoPass2026!');
      if (!res?.success && register) {
        await register('demo_author', 'demo_author@synctone.internal', 'DemoPass2026!', 'writer');
      }
    } catch (err) {
      setError('Failed to log in demo author: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSubmit = async (e, shouldReadNow = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);

    if (isParsingFile) {
      setError('Please wait for manuscript file analysis to finish before creating the novel.');
      return;
    }

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!isAuthenticated) {
      setError('Please sign in or create an author account to publish a novel.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.novels.create({
        title: title.trim(),
        synopsis: synopsis.trim(),
        channel,
        global_tone: globalTone.trim(),
        cover_object: coverObject || null,
        parser_engine: parserEngine,
        characters: parsedCharacters,
        chapters: parsedChapters,
      });

      if (res?.novel) {
        if (!res.novel.cover_object && coverObject) {
          res.novel.cover_object = coverObject;
        }
        let firstChapter = res?.chapters?.[0] || null;

        // If backend did not create chapters in batch, upload them sequentially
        if (!firstChapter && parsedChapters.length > 0 && res.novel.id) {
          try {
            for (const ch of parsedChapters) {
              const upRes = await api.novels.uploadChapter(res.novel.id, {
                title: ch.title,
                text: ch.raw_text,
                chapter_number: ch.chapter_number,
              });
              if (!firstChapter && upRes?.chapter) {
                firstChapter = upRes.chapter;
              }
            }
          } catch (upErr) {
            console.warn('Chapter ingestion fallback notice:', upErr);
          }
        }

        // Open directly in Reader if user clicked "Create & Read Now" or onSelectChapter is provided
        if ((shouldReadNow || onSelectChapter) && firstChapter) {
          if (onSelectChapter) {
            onSelectChapter(res.novel, firstChapter);
          } else if (onNovelCreated) {
            onNovelCreated(res.novel, firstChapter);
          }
        } else {
          if (onNovelCreated) {
            onNovelCreated(res.novel, firstChapter);
          }
        }
        setTitle('');
        setSynopsis('');
        handleRemoveFile();
        onClose();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err.message || 'Failed to create novel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-novel-modal-title"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={{ duration: 0.2 }}
      >
        <m.div
          className="w-full max-w-xl theme-surface rounded-2xl shadow-2xl border overflow-hidden max-h-[90vh] flex flex-col"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
        {/* Modal Header */}
        <div className="p-5 border-b theme-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent-text)]">
              <IconBook className="w-4 h-4" />
            </div>
            <div>
              <h2 id="add-novel-modal-title" className="text-base font-bold theme-heading font-serif">Add New Novel</h2>
              <p className="text-[11px] theme-muted">
                Import EPUB, PDF, TXT or author your novel with synchronized audio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg theme-muted hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
            aria-label="Close modal"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Auth Warning Banner */}
          {!isAuthenticated && (
            <div className="p-3 bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-[var(--warning)] text-xs rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <span>Sign in with an author account to publish directly to the catalog.</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isLoggingIn}
                  className="px-2.5 py-1 bg-[var(--warning)]/20 hover:bg-[var(--warning)]/30 text-[var(--warning)] border border-[var(--warning)]/40 rounded-lg font-bold text-[11px] transition cursor-pointer"
                >
                  {isLoggingIn ? 'Logging in...' : 'Quick Demo Author Login'}
                </button>
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuth('login');
                    }}
                    className="font-bold underline text-[var(--warning)] hover:text-[var(--text-main)] cursor-pointer text-[11px]"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[var(--danger)]/10 text-[var(--danger)] text-xs rounded-xl border border-[var(--danger)]/20">
              {error}
            </div>
          )}

          {/* ================================================================= */}
          {/* 3-TIER AI MANUSCRIPT PARSER & ATTRIBUTION SELECTOR                 */}
          {/* ================================================================= */}
          <div className="p-3.5 rounded-2xl theme-card border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="parser-engine-select"
                className="text-xs font-bold theme-heading flex items-center gap-1.5"
              >
                <IconSparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>AI Manuscript Parser & Speaker Attribution</span>
              </label>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                3-Tier Pipeline
              </span>
            </div>

            <select
              id="parser-engine-select"
              aria-label="Select Manuscript Parser Engine"
              data-testid="parser-engine-selector"
              value={parserEngine}
              onChange={(e) => {
                const val = e.target.value;
                setParserEngine(val);
                try {
                  localStorage.setItem('synctone_parser_engine', val);
                } catch (_) {}
              }}
              className="w-full px-3 py-2 text-xs theme-surface border rounded-xl focus:outline-none focus:border-[var(--border-focus)] transition font-mono font-semibold"
            >
              <option value="heuristic">
                Tier 1: Fast Local Heuristic (Default — Clean EPUB / TXT / PDF)
              </option>
              <option value="gemini">
                Tier 2: Google Gemini Multimodal AI (Scanned PDF / Noisy OCR + Smart Cast)
              </option>
              <option value="unlimited-ocr">
                Tier 3: Baidu Unlimited-OCR vLLM (Self-Hosted Vision Layout & BBox OCR)
              </option>
            </select>

            <p className="text-[11px] theme-muted leading-relaxed">
              {parserEngine === 'gemini'
                ? 'Uses Gemini Flash multimodal vision to reconstruct noisy/scanned pages and attribute complex unquoted multi-party dialogue.'
                : parserEngine === 'unlimited-ocr'
                ? 'Connects to Baidu Unlimited-OCR (vLLM) to extract layout-aware Markdown and figure bounding boxes before dialogue attribution.'
                : 'Zero-latency local extraction via foliate-js / pdfjs-dist / pypdf with deterministic regex and alternation speaker attribution.'}
            </p>
          </div>

          {/* ================================================================= */}
          {/* DRAG & DROP NOVEL FILE DROPZONE ("DROPBOX")                        */}
          {/* ================================================================= */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold theme-sub uppercase tracking-wider font-mono">
              Novel File Dropzone (EPUB, MOBI, AZW3, FB2, PDF, TXT, MD, HTML)
            </label>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub,.pdf,.txt,.md,.html,.mobi,.azw3,.kf8,.fb2,.fbz,application/epub+zip,application/pdf,application/x-mobipocket-ebook,application/vnd.amazon.ebook,application/x-fictionbook+xml,text/plain,text/markdown,text/html"
              onChange={handleFileInputChange}
              className="hidden"
              data-testid="novel-file-input"
            />

            {!uploadedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.01]'
                    : 'border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)]'
                }`}
                role="region"
                aria-label="Novel file dropzone"
              >
                {isParsingFile ? (
                  <div className="py-4 flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                    <span className="text-xs font-semibold text-[var(--accent-text)]">
                      Analyzing manuscript & extracting chapters...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent-text)] shadow-sm">
                      <IconUpload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold theme-heading">
                        Drag & drop your novel manuscript here, or{' '}
                        <span className="text-[var(--accent-text)] underline">Browse Files</span>
                      </p>
                      <p className="text-[11px] theme-muted mt-1">
                        Supports EPUB, MOBI, AZW3, FB2, PDF, TXT, Markdown, and HTML files
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                      {['EPUB', 'MOBI', 'AZW3', 'FB2', 'PDF', 'TXT', 'MD', 'HTML'].map((fmt) => (
                        <span
                          key={fmt}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 border border-white/10 theme-muted"
                        >
                          .{fmt.toLowerCase()}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Status Card when File is Successfully Extracted */
              <div className="p-4 rounded-2xl theme-card border border-[var(--success)]/30 bg-[var(--success)]/5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-[var(--success)]/15 text-[var(--success)] flex-shrink-0">
                      <IconCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30">
                          {uploadedFile.format}
                        </span>
                        <p className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                          {uploadedFile.name}
                        </p>
                      </div>
                      <p className="text-[11px] text-[var(--success)]/90 font-mono mt-0.5">
                        {uploadedFile.size} • {uploadedFile.chapterCount} chapters ready to read
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(!previewOpen)}
                      className="px-2.5 py-1 rounded-lg theme-card border text-[11px] font-semibold hover:border-[var(--border-focus)] transition"
                    >
                      {previewOpen ? 'Hide Preview' : 'Preview Text'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      aria-label="Remove uploaded file"
                      className="p-1.5 rounded-lg theme-muted hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition"
                      title="Remove file"
                    >
                      <IconX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Extracted Chapter Preview */}
                {previewOpen && (
                  <div className="pt-2 border-t border-[var(--success)]/20 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--success)]">
                      <span>Detected Chapters ({parsedChapters.length})</span>
                      <span>Ready for Reader & Synthesis</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                      {parsedChapters.map((ch, idx) => (
                        <div
                          key={ch.chapter_number || idx}
                          className="p-2.5 rounded-xl bg-black/30 border border-white/10 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold text-[var(--accent-text)]">
                            <span>{ch.title || `Chapter ${idx + 1}`}</span>
                            <span className="text-[10px] font-mono theme-muted">
                              {ch.raw_text?.length || 0} chars
                            </span>
                          </div>
                          <p className="text-[11px] theme-muted line-clamp-2 leading-relaxed">
                            {ch.raw_text?.slice(0, 180)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TTS DOM Sanitizer Toggle (Strictly Opt-In) */}
          <div className="p-3.5 rounded-2xl theme-card border border-[var(--border-subtle)] flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold theme-heading">TTS DOM Sanitizer (tts-dom-cleaner)</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30">
                  Opt-in
                </span>
              </div>
              <p className="text-[11px] theme-muted leading-relaxed">
                Optional: Strips hidden scraper watermarks, ASCII dividers (***), and duplicate paragraphs. Leave off if a novel has custom formatting.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              data-testid="tts-sanitizer-toggle"
              aria-checked={useTtsSanitizer}
              onClick={() => setUseTtsSanitizer((prev) => !prev)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                useTtsSanitizer ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  useTtsSanitizer ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Novel Title Input */}
          <div>
            <label className="block text-xs font-semibold theme-sub uppercase tracking-wider mb-1.5 font-mono">
              Novel Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Harry Potter and the Philosopher's Stone"
              required
              className="w-full px-3.5 py-2.5 text-xs theme-card border rounded-xl placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition"
            />
          </div>

          {/* Distribution Channel Selector */}
          <div>
            <label className="block text-xs font-semibold theme-sub uppercase tracking-wider mb-1.5 font-mono">
              Distribution Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs theme-card border rounded-xl focus:outline-none focus:border-[var(--border-focus)] transition"
            >
              <option value="verified">Verified Channel (Production Cast)</option>
              <option value="community">Community Channel</option>
            </select>
          </div>

          {/* Global Tone / Genre Input */}
          <div>
            <label className="block text-xs font-semibold theme-sub uppercase tracking-wider mb-1.5 font-mono">
              Global Tone / Genre
            </label>
            <input
              type="text"
              value={globalTone}
              onChange={(e) => setGlobalTone(e.target.value)}
              placeholder="e.g. Victorian Mystery, British Fantasy"
              className="w-full px-3.5 py-2.5 text-xs theme-card border rounded-xl placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition"
            />
          </div>

          {/* Synopsis Textarea */}
          <div>
            <label className="block text-xs font-semibold theme-sub uppercase tracking-wider mb-1.5 font-mono">
              Synopsis
            </label>
            <textarea
              rows={3}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Brief summary or description of the story..."
              className="w-full px-3.5 py-2.5 text-xs theme-card border rounded-xl placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition resize-none"
            />
          </div>

          {/* Cover Image (Optional — Auto-extracted or Upload Custom) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold theme-sub uppercase tracking-wider font-mono">
                Cover Image (Optional — Auto-extracted from EPUB/PDF or Upload Custom)
              </label>
              {coverObject && (
                <button
                  type="button"
                  onClick={() => setCoverObject(null)}
                  className="text-[11px] text-[var(--danger)] hover:underline cursor-pointer"
                >
                  Remove Cover
                </button>
              )}
            </div>

            <input
              ref={customCoverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleCustomCoverUpload}
            />

            <div className="p-3 rounded-xl theme-card border flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {coverObject ? (
                  <img
                    src={coverObject}
                    alt="Novel Cover Preview"
                    className="w-12 h-16 object-cover rounded-lg border theme-border flex-shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-16 rounded-lg border border-dashed theme-border flex items-center justify-center text-[10px] theme-muted flex-shrink-0 bg-white/5">
                    No Cover
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium theme-heading truncate">
                    {coverObject ? 'Cover Artwork Ready' : 'Auto-extracted from manuscript or upload custom image'}
                  </p>
                  <p className="text-[11px] theme-muted truncate">
                    {coverObject || 'PNG, JPG, or WEBP (3:4 ratio recommended)'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => customCoverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="px-3 py-1.5 rounded-lg theme-card border text-xs font-semibold hover:border-[var(--border-focus)] transition flex-shrink-0 cursor-pointer"
              >
                {isUploadingCover ? 'Uploading...' : coverObject ? 'Change Cover' : 'Upload Cover'}
              </button>
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-3 flex flex-wrap items-center justify-end gap-3 border-t theme-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 theme-card border rounded-xl text-xs font-semibold theme-muted hover:text-[var(--text-main)] transition cursor-pointer"
            >
              Cancel
            </button>

            {/* Direct Read Option: Create & Read Now when Chapters Exist */}
            {parsedChapters.length > 0 && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting || isParsingFile}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <IconPlay className="w-3.5 h-3.5 fill-current" />
                <span>{isSubmitting ? 'Creating & Ingesting...' : 'Create & Read Now'}</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isParsingFile}
              className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>{isParsingFile ? 'Analyzing File...' : isSubmitting ? 'Creating...' : 'Create Novel'}</span>
            </button>
          </div>
        </form>
      </m.div>
    </m.div>
  </LazyMotion>
  );
}
