// Item catalogue derived from what the user has already bought, so the add form
// can autocomplete names and prefill the usual unit and last paid rate.

import { normalizeUnit, cleanItemName, guessCategory } from './groceryModel';

// Spellings that differ only by case/spacing/punctuation collapse onto one entry.
export const itemCatalogKeyOf = (name) => cleanItemName(name).toLowerCase().replace(/[^a-z0-9]/g, '');

const foldInto = (catalog, { item, unit, rate, date, quantity, value }) => {
  const key = itemCatalogKeyOf(item);
  if (!key) return;

  const entry = catalog.get(key) || {
    key,
    names: new Map(),
    units: new Map(),
    quantities: new Map(),
    values: new Map(),
    rate: null,
    latest: '',
  };
  const name = cleanItemName(item);
  entry.names.set(name, (entry.names.get(name) || 0) + 1);

  const canonicalUnit = normalizeUnit(unit);
  if (canonicalUnit) entry.units.set(canonicalUnit, (entry.units.get(canonicalUnit) || 0) + 1);

  if (Number.isFinite(quantity) && quantity > 0) {
    const quantityKey = `${quantity}|${canonicalUnit}`;
    const quantityEntry = entry.quantities.get(quantityKey) || { quantity, unit: canonicalUnit, count: 0 };
    quantityEntry.count += 1;
    entry.quantities.set(quantityKey, quantityEntry);
  }
  if (Number.isFinite(value) && value >= 0) {
    entry.values.set(value, (entry.values.get(value) || 0) + 1);
  }

  if (String(date) >= entry.latest && Number.isFinite(rate)) {
    entry.latest = String(date);
    entry.rate = rate;
    entry.unit = canonicalUnit || entry.unit;
  }
  catalog.set(key, entry);
};

const mostCommon = (counts) => [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];

const mostFrequent = (counts, compareValues) => [...counts.entries()]
  .sort((a, b) => b[1].count - a[1].count || compareValues(a[1], b[1]))
  .slice(0, 3)
  .map(([, suggestion]) => suggestion);

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
        category: guessCategory(name).toLowerCase(),
        times,
        quantitySuggestions: mostFrequent(
          new Map([...entry.quantities].map(([key, suggestion]) => [key, { ...suggestion }])),
          (a, b) => a.quantity - b.quantity || a.unit.localeCompare(b.unit)
        ),
        valueSuggestions: mostFrequent(
          new Map([...entry.values].map(([value, count]) => [value, { value, count }])),
          (a, b) => a.value - b.value
        ),
      };
    })
    .sort((a, b) => b.times - a.times || a.name.localeCompare(b.name));
};
