import { extractClipboardUrls, normalizeLink, normalizeUrl } from './linkModel';

describe('link model helpers', () => {
  test('normalizes web addresses and adds HTTPS when missing', () => {
    expect(normalizeUrl('example.com/article')).toBe('https://example.com/article');
    expect(normalizeUrl(' https://example.com ')).toBe('https://example.com/');
  });

  test('rejects non-web protocols and malformed addresses', () => {
    expect(() => normalizeUrl('javascript:alert(1)')).toThrow('valid HTTP or HTTPS');
    expect(() => normalizeUrl('not a url')).toThrow('valid web address');
  });

  test('extracts unique URLs from copied text and strips trailing punctuation', () => {
    expect(extractClipboardUrls('Read this: https://example.com/story. https://another.example/path)'))
      .toEqual(['https://example.com/story', 'https://another.example/path']);
    expect(extractClipboardUrls('https://example.com https://example.com/'))
      .toEqual(['https://example.com/']);
  });

  test('returns no URLs when copied text does not contain a link', () => {
    expect(extractClipboardUrls('some unrelated copied text')).toEqual([]);
    expect(extractClipboardUrls('example.com')).toEqual(['https://example.com/']);
  });

  test('normalizes stored records and deduplicates tags', () => {
    expect(normalizeLink({
      id: 'link-1',
      url: 'example.com',
      title: ' Example ',
      notes: ' Note ',
      tags: ['read later', 'read later', ''],
      favorite: 1,
    })).toMatchObject({
      id: 'link-1',
      url: 'https://example.com/',
      title: 'Example',
      notes: 'Note',
      tags: ['read later'],
      favorite: true,
    });
  });
});
