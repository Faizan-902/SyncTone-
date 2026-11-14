const PLACEHOLDER_UPLOADER_USERNAMES = new Set([
  'admin',
  'administrator',
  'system',
  'moderator',
  'uploader',
  'synctone',
]);

const KNOWN_CLASSIC_AUTHORS = [
  [/sherlock\s+holmes|scandal\s+in\s+bohemia|hound\s+of\s+the\s+baskervilles|sign\s+of\s+the?\s*four|study\s+in\s+scarlet|valley\s+of\s+fear/i, 'Sir Arthur Conan Doyle'],
  [/harry\s+potter/i, 'J.K. Rowling'],
  [/\bdracula\b/i, 'Bram Stoker'],
  [/\bfrankenstein\b/i, 'Mary Shelley'],
  [/pride\s+and\s+prejudice|sense\s+and\s+sensibility|\bemma\b/i, 'Jane Austen'],
  [/moby[\s-]+dick/i, 'Herman Melville'],
  [/great\s+gatsby/i, 'F. Scott Fitzgerald'],
  [/alice.*wonderland|through\s+the\s+looking[\s-]+glass/i, 'Lewis Carroll'],
  [/count\s+of\s+monte\s+cristo/i, 'Alexandre Dumas'],
  [/picture\s+of\s+dorian\s+gray/i, 'Oscar Wilde'],
  [/\bnineteen\s+eighty[\s-]+four\b|\b1984\b|animal\s+farm/i, 'George Orwell'],
  [/strange\s+case\s+of\s+dr\.?\s*jekyll/i, 'Robert Louis Stevenson'],
  [/time\s+machine|war\s+of\s+the\s+worlds/i, 'H.G. Wells'],
];

/**
 * Resolve a clean literary author display string for a novel, avoiding leaking
 * internal admin/system account usernames into reader headers or player chrome.
 */
export function formatNovelAuthor(novel, fallback = '') {
  const novelObj = novel?.novel || novel;
  if (!novelObj) return fallback;

  const explicitAuthor = String(
    novelObj.author || novelObj.author_name || novelObj.writer || ''
  ).trim();
  if (explicitAuthor) return explicitAuthor;

  const rawUsername = String(novelObj.author_username || '').trim();
  if (rawUsername && !PLACEHOLDER_UPLOADER_USERNAMES.has(rawUsername.toLowerCase())) {
    return rawUsername;
  }

  const title = String(novelObj.title || '');
  for (const [pattern, literaryAuthor] of KNOWN_CLASSIC_AUTHORS) {
    if (pattern.test(title)) {
      return literaryAuthor;
    }
  }

  if (fallback) return fallback;
  return novelObj.channel === 'verified' ? 'Classic Edition' : '';
}
