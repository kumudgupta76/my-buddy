// Item catalogue derived from the seeded sheet so autocomplete, default units
// and last-known rates work even before the user has entered anything.

import { SEED_ROWS } from './grocerySeedData';
import { makeRecord, normalizeUnit, cleanItemName, guessCategory } from './groceryModel';

export const SEED_COUNT = SEED_ROWS.length;

export const buildSeedRecords = () => SEED_ROWS.map(([date, item, quantity, unit, value, rate]) => makeRecord({
  date, item, quantity, unit, value, rate, notes: 'Seeded from sheet',
}));

// Spellings that differ only by case/spacing/punctuation collapse onto one entry.
const catalogKeyOf = (name) => cleanItemName(name).toLowerCase().replace(/[^a-z0-9]/g, '');

const foldInto = (catalog, { item, unit, rate, date }) => {
  const key = catalogKeyOf(item);
  if (!key) return;

  const entry = catalog.get(key) || { key, names: new Map(), units: new Map(), rate: null, latest: '' };
  const name = cleanItemName(item);
  entry.names.set(name, (entry.names.get(name) || 0) + 1);

  const canonicalUnit = normalizeUnit(unit);
  if (canonicalUnit) entry.units.set(canonicalUnit, (entry.units.get(canonicalUnit) || 0) + 1);

  if (String(date) >= entry.latest && Number.isFinite(rate)) {
    entry.latest = String(date);
    entry.rate = rate;
    entry.unit = canonicalUnit || entry.unit;
  }
  catalog.set(key, entry);
};

const mostCommon = (counts) => [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];

const finalize = (catalog) => [...catalog.values()]
  .map((entry) => {
    const name = mostCommon(entry.names);
    const times = [...entry.names.values()].reduce((sum, count) => sum + count, 0);
    return {
      key: entry.key,
      name,
      unit: entry.unit || mostCommon(entry.units) || '',
      rate: entry.rate,
      category: guessCategory(name),
      times,
    };
  })
  .sort((a, b) => b.times - a.times || a.name.localeCompare(b.name));

const SEED_CATALOG_MAP = SEED_ROWS.reduce((catalog, [date, item, , unit, , rate]) => {
  foldInto(catalog, { item, unit, rate, date });
  return catalog;
}, new Map());

export const SEED_CATALOG = finalize(SEED_CATALOG_MAP);

/** Seed catalogue plus anything the user has actually bought, theirs winning. */
export const buildItemCatalog = (records = []) => {
  const catalog = new Map();
  SEED_CATALOG_MAP.forEach((entry, key) => {
    catalog.set(key, {
      key,
      names: new Map(entry.names),
      units: new Map(entry.units),
      rate: entry.rate,
      unit: entry.unit,
      latest: entry.latest,
    });
  });
  records.forEach((record) => foldInto(catalog, record));
  return finalize(catalog);
};
