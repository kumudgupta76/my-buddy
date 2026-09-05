import {
  normalizeUnit,
  cleanItemName,
  itemKeyOf,
  guessCategory,
  toNumber,
  deriveAmounts,
  hasRateMismatch,
  isIncomplete,
  makeRecord,
  splitDuplicates,
  findDuplicatesAgainst,
  computeSummary,
  monthlySpend,
  categorySpend,
  itemSummary,
  findAliasGroups,
  findUnitConflicts,
  recalculateRate,
  formatCurrency,
} from './groceryModel';

const record = (overrides) => makeRecord({
  date: '2025-06-04', item: 'Rice', quantity: 5, unit: 'kg', value: 500, rate: 100, ...overrides,
});

describe('normalisation', () => {
  it('folds unit spellings onto one canonical unit', () => {
    expect(['Kg', 'kg ', 'KGS'].map(normalizeUnit)).toEqual(['kg', 'kg', 'kg']);
    expect(['l', 'lt', 'ltr', 'Liter'].map(normalizeUnit)).toEqual(['l', 'l', 'l', 'l']);
    expect(['gm', 'g', 'GRAMS'].map(normalizeUnit)).toEqual(['g', 'g', 'g']);
    expect(['packet', 'pack', 'pkt'].map(normalizeUnit)).toEqual(['packet', 'packet', 'packet']);
  });

  it('keeps unknown units instead of dropping them', () => {
    expect(normalizeUnit('ladi')).toBe('ladi');
    expect(normalizeUnit('  ')).toBe('');
  });

  it('collapses whitespace in item names and keys them case-insensitively', () => {
    expect(cleanItemName('  Parle   G  Gold ')).toBe('Parle G Gold');
    expect(itemKeyOf('KAJU')).toBe(itemKeyOf('kaju'));
  });

  it('guesses a category from the item name', () => {
    expect(guessCategory('Arhar Dal')).toBe('Grains & Pulses');
    expect(guessCategory('Sarson Oil')).toBe('Oil & Ghee');
    expect(guessCategory('Head & Shoulder')).toBe('Personal Care');
    expect(guessCategory('Zzz')).toBe('Other');
  });

  it('parses currency-formatted numbers', () => {
    expect(toNumber('₹1,040')).toBe(1040);
    expect(toNumber('0.25')).toBe(0.25);
    expect(toNumber('abc')).toBeNull();
    expect(toNumber('')).toBeNull();
  });
});

describe('deriveAmounts', () => {
  it('fills in whichever field is missing', () => {
    expect(deriveAmounts({ quantity: 2, value: 260, rate: null }).rate).toBe(130);
    expect(deriveAmounts({ quantity: 2, value: null, rate: 130 }).value).toBe(260);
    expect(deriveAmounts({ quantity: null, value: 260, rate: 130 }).quantity).toBe(2);
  });

  it('never overwrites values the sheet already supplies', () => {
    expect(deriveAmounts({ quantity: 0.4, value: 110, rate: 275 })).toEqual({ quantity: 0.4, value: 110, rate: 275 });
  });
});

describe('validation', () => {
  it('flags rows where quantity × rate disagrees with the total paid', () => {
    expect(hasRateMismatch(record({ quantity: 0.4, value: 110, rate: 275 }))).toBe(false);
    expect(hasRateMismatch(record({ quantity: 2, value: 500, rate: 100 }))).toBe(true);
  });

  it('does not flag rounding-level differences', () => {
    expect(hasRateMismatch(record({ quantity: 3, value: 100, rate: 33.33 }))).toBe(false);
  });

  it('detects rows missing the essentials', () => {
    expect(isIncomplete(record())).toBe(false);
    expect(isIncomplete(makeRecord({ date: '2025-06-04', item: '', quantity: 1, unit: 'kg', value: 10 }))).toBe(true);
    expect(isIncomplete(makeRecord({ date: '', item: 'Rice', quantity: 1, unit: 'kg', value: 10 }))).toBe(true);
  });
});

describe('duplicates', () => {
  const a = record();
  const b = record();
  const c = record({ item: 'Sugar', value: 220 });

  it('separates repeated identical purchases', () => {
    const { unique, duplicates } = splitDuplicates([a, b, c]);
    expect(unique).toHaveLength(2);
    expect(duplicates).toHaveLength(1);
  });

  it('compares incoming rows against what is already stored', () => {
    const { fresh, duplicates } = findDuplicatesAgainst([a], [b, c]);
    expect(fresh.map((r) => r.item)).toEqual(['Sugar']);
    expect(duplicates).toHaveLength(1);
  });
});

describe('aggregations', () => {
  const records = [
    record({ date: '2025-06-04', item: 'Rice', quantity: 5, value: 500, rate: 100 }),
    record({ date: '2025-06-04', item: 'Kaju', quantity: 0.5, value: 520, rate: 1040 }),
    record({ date: '2025-10-09', item: 'Rice', quantity: 5, value: 400, rate: 80 }),
  ];

  it('summarises rows, spend and trips', () => {
    expect(computeSummary(records)).toEqual({
      rows: 3, totalSpend: 1420, trips: 2, uniqueItems: 2, avgPerTrip: 710,
    });
  });

  it('buckets spend by month, newest first', () => {
    expect(monthlySpend(records)).toEqual([
      { key: '2025-10', month: '2025-10', total: 400, rows: 1 },
      { key: '2025-06', month: '2025-06', total: 1020, rows: 2 },
    ]);
  });

  it('buckets spend by category', () => {
    const byCategory = categorySpend(records);
    expect(byCategory.find((c) => c.category === 'Grains & Pulses').total).toBe(900);
    expect(byCategory.find((c) => c.category === 'Dry Fruits').total).toBe(520);
  });

  it('tracks the latest rate and its movement per item', () => {
    const rice = itemSummary(records).find((i) => i.key === 'rice');
    expect(rice).toMatchObject({ times: 2, total: 900, latestRate: 80, previousRate: 100, changePercent: -20 });
  });
});

describe('cleanup helpers', () => {
  it('groups item names that differ only by case or spacing', () => {
    const groups = findAliasGroups([record({ item: 'Kaju' }), record({ item: 'kaju' }), record({ item: 'Rice' })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].variants.map((v) => v.name).sort()).toEqual(['Kaju', 'kaju']);
  });

  it('reports items bought under conflicting units', () => {
    const conflicts = findUnitConflicts([record({ item: 'Ghee', unit: 'kg' }), record({ item: 'Ghee', unit: 'l' })]);
    expect(conflicts[0].units.sort()).toEqual(['kg', 'l']);
  });

  it('resets the rate to total ÷ quantity', () => {
    expect(recalculateRate(record({ quantity: 2, value: 500, rate: 100 })).rate).toBe(250);
  });
});

describe('formatCurrency', () => {
  it('renders rupees and copes with missing amounts', () => {
    expect(formatCurrency(1040)).toBe('₹1,040');
    expect(formatCurrency(null)).toBe('—');
  });
});
