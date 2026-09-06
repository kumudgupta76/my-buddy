import { DEFAULT_SETTINGS, POSTER_PAGE_SIZES, mergeSettings } from './posterStorage';

test('older accounts default to 24 posters per page and visible collage history', () => {
    expect(mergeSettings()).toEqual(expect.objectContaining({ pageSize: 24, showCollageHistory: true }));
    expect(mergeSettings(null)).toEqual(expect.objectContaining({ pageSize: 24, showCollageHistory: true }));
});

test.each(POSTER_PAGE_SIZES)('restores the supported page size %s', pageSize => {
    expect(mergeSettings({ pageSize }).pageSize).toBe(pageSize);
    expect(mergeSettings({ pageSize: String(pageSize) }).pageSize).toBe(pageSize);
});

test.each([0, -1, 7, 24.5, null, 'invalid'])('replaces invalid page size %s with the default', pageSize => {
    expect(mergeSettings({ pageSize }).pageSize).toBe(DEFAULT_SETTINGS.pageSize);
});

test('preserves an explicit history visibility preference and defaults invalid values', () => {
    expect(mergeSettings({ showCollageHistory: false }).showCollageHistory).toBe(false);
    expect(mergeSettings({ showCollageHistory: true }).showCollageHistory).toBe(true);
    expect(mergeSettings({ showCollageHistory: 'false' }).showCollageHistory).toBe(true);
});