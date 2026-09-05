// Item catalogue derived from what the user has already bought, so the add form
// can autocomplete names and prefill the usual unit and last paid rate.

import { normalizeUnit, cleanItemName, guessCategory } from './groceryModel';

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

export const buildItemCatalog = (records = []) => {
  const catalog = new Map();
  records.forEach((record) => foldInto(catalog, record));

  return [...catalog.values()]
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
};
