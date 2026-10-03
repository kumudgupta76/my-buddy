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

export const extractClipboardUrl = (text) => {
  const matches = String(text || '').match(/https?:\/\/[^\s<>"']+/gi) || [];
  if (matches.length !== 1) {
    if (matches.length > 1) throw new Error('Clipboard contains multiple links. Paste one link at a time.');
    const candidate = String(text || '').trim();
    if (!candidate || /\s/.test(candidate)) throw new Error('No single link was found in the clipboard');
    return normalizeUrl(candidate);
  }

  return normalizeUrl(matches[0].replace(/[.,!?;:)\]}]+$/, ''));
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
