import { extractClipboardUrl, normalizeLink, normalizeUrl } from './linkModel';

describe('link model helpers', () => {
  test('normalizes web addresses and adds HTTPS when missing', () => {
    expect(normalizeUrl('example.com/article')).toBe('https://example.com/article');
    expect(normalizeUrl(' https://example.com ')).toBe('https://example.com/');
  });

  test('rejects non-web protocols and malformed addresses', () => {
    expect(() => normalizeUrl('javascript:alert(1)')).toThrow('valid HTTP or HTTPS');
    expect(() => normalizeUrl('not a url')).toThrow('valid web address');
  });

  test('extracts one URL from copied text and strips trailing punctuation', () => {
    expect(extractClipboardUrl('Read this: https://example.com/story.')).toBe('https://example.com/story');
  });

  test('requires clipboard text to contain a single link', () => {
    expect(() => extractClipboardUrl('https://a.example https://b.example')).toThrow('multiple links');
    expect(() => extractClipboardUrl('some unrelated copied text')).toThrow('No single link');
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
