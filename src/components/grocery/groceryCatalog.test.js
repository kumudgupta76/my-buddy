import { SEED_ROWS } from './grocerySeedData';
import { buildSeedRecords, buildItemCatalog, SEED_CATALOG, SEED_COUNT } from './groceryCatalog';
import { isIncomplete, splitDuplicates, makeRecord } from './groceryModel';

describe('seed data', () => {
  it('carries every usable row from the sheet', () => {
    expect(SEED_COUNT).toBe(SEED_ROWS.length);
    expect(SEED_COUNT).toBeGreaterThan(200);
  });

  it('builds records that pass the app’s own validation', () => {
    const records = buildSeedRecords();
    expect(records).toHaveLength(SEED_COUNT);
    expect(records.filter(isIncomplete)).toHaveLength(0);
    expect(records.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date))).toBe(true);
  });

  it('contains no duplicate purchases', () => {
    expect(splitDuplicates(buildSeedRecords()).duplicates).toHaveLength(0);
  });

  it('gives every record a unique id', () => {
    const records = buildSeedRecords();
    expect(new Set(records.map((r) => r.id)).size).toBe(records.length);
  });
});

describe('item catalogue', () => {
  it('folds spelling variants onto a single entry with the most-used name', () => {
    const catalog = buildItemCatalog([]);
    const kaju = catalog.filter((entry) => entry.key === 'kaju');
    expect(kaju).toHaveLength(1);
    expect(kaju[0].unit).toBe('kg');
  });

  it('normalises units and keeps a usable rate', () => {
    expect(SEED_CATALOG.every((entry) => entry.unit === entry.unit.toLowerCase())).toBe(true);
    expect(SEED_CATALOG.filter((entry) => entry.rate !== null && entry.rate > 0).length)
      .toBeGreaterThan(SEED_CATALOG.length * 0.9);
  });

  it('is ordered by how often the item is bought', () => {
    const times = SEED_CATALOG.map((entry) => entry.times);
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('lets the user’s own purchases override the seeded rate and unit', () => {
    const catalog = buildItemCatalog([
      makeRecord({ date: '2030-01-01', item: 'Rice', quantity: 5, unit: 'kg', value: 600, rate: 120 }),
    ]);
    const rice = catalog.find((entry) => entry.key === 'rice');
    expect(rice.rate).toBe(120);
    expect(rice.unit).toBe('kg');
  });

  it('includes items the user added that were never in the sheet', () => {
    const catalog = buildItemCatalog([
      makeRecord({ date: '2030-01-01', item: 'Dragon Fruit', quantity: 1, unit: 'kg', value: 300, rate: 300 }),
    ]);
    expect(catalog.some((entry) => entry.name === 'Dragon Fruit')).toBe(true);
    expect(catalog).toHaveLength(SEED_CATALOG.length + 1);
  });
});
