export const normalizeUrl = (value) => {
  const input = String(value || '').trim();
  if (!input) throw new Error('Enter a link URL');

  let parsed;
  try {
    parsed = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`);
  } catch {
    throw new Error('Enter a valid web address');
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) {
    throw new Error('Enter a valid HTTP or HTTPS link');
  }

  return parsed.toString();
};

export const extractClipboardUrls = (text) => {
  const matches = String(text || '').match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi) || [];
  const candidates = matches.length
    ? matches
    : String(text || '').trim() && !/\s/.test(String(text).trim())
      ? [String(text).trim()]
      : [];
  const urls = candidates.map(candidate => {
    try {
      return normalizeUrl(candidate.replace(/[.,!?;:)\]}]+$/, ''));
    } catch {
      return null;
    }
  }).filter(Boolean);

  return [...new Set(urls)];
};

export const createLinkId = () =>
  `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const normalizeLink = (link) => ({
  id: String(link.id || createLinkId()),
  url: normalizeUrl(link.url),
  title: String(link.title || '').trim(),
  notes: String(link.notes || '').trim(),
  tags: Array.isArray(link.tags)
    ? [...new Set(link.tags.map(tag => String(tag).trim()).filter(Boolean))]
    : [],
  favorite: Boolean(link.favorite),
  createdAt: link.createdAt || new Date().toISOString(),
  updatedAt: link.updatedAt || link.createdAt || new Date().toISOString(),
});
