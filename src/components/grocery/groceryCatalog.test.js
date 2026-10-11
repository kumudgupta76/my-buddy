import { buildItemCatalog } from './groceryCatalog';
import { makeRecord } from './groceryModel';

const record = (item, overrides = {}) => makeRecord({
  date: '2025-06-04', item, quantity: 1, unit: 'kg', value: 100, rate: 100, ...overrides,
});

describe('buildItemCatalog', () => {
  it('is empty until something has been bought', () => {
    expect(buildItemCatalog([])).toEqual([]);
  });

  it('folds spelling variants onto one entry and keeps the most-used name', () => {
    const catalog = buildItemCatalog([record('Kaju'), record('kaju'), record('Kaju')]);
    expect(catalog).toHaveLength(1);
    expect(catalog[0]).toMatchObject({ key: 'kaju', name: 'kaju', times: 3 });
  });

  it('normalises units and guesses a category', () => {
    const catalog = buildItemCatalog([record('Sarson Oil', { unit: 'Ltr' })]);
    expect(catalog[0]).toMatchObject({ unit: 'l', category: 'oil & ghee' });
  });

  it('reports the rate and unit from the most recent purchase', () => {
    const catalog = buildItemCatalog([
      record('Rice', { date: '2025-06-04', rate: 100 }),
      record('Rice', { date: '2025-10-09', rate: 80 }),
    ]);
    expect(catalog[0]).toMatchObject({ rate: 80, unit: 'kg' });
  });

  it('orders entries by how often the item is bought', () => {
    const catalog = buildItemCatalog([record('Rice'), record('Rice'), record('Kaju')]);
    expect(catalog.map((entry) => entry.name)).toEqual(['rice', 'kaju']);
  });

  it('ranks quantity and total-paid suggestions by their frequency', () => {
    const catalog = buildItemCatalog([
      record('Rice', { quantity: 5, value: 500 }),
      record('Rice', { quantity: 1, value: 100 }),
      record('Rice', { quantity: 5, value: 500 }),
      record('Rice', { quantity: 2, value: 200 }),
    ]);

    expect(catalog[0].quantitySuggestions).toEqual([
      { quantity: 5, unit: 'kg', count: 2 },
      { quantity: 1, unit: 'kg', count: 1 },
      { quantity: 2, unit: 'kg', count: 1 },
    ]);
    expect(catalog[0].valueSuggestions).toEqual([
      { value: 500, count: 2 },
      { value: 100, count: 1 },
      { value: 200, count: 1 },
    ]);
  });

  it('ignores rows with no item name', () => {
    expect(buildItemCatalog([{ item: '', unit: 'kg', rate: 10, date: '2025-01-01' }])).toEqual([]);
  });
});
