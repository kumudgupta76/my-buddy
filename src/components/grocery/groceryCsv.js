// CSV parsing/serialising for the grocery sheet. The source file has two columns
// both literally named "Unit", so headers are resolved positionally after the
// first match rather than by name alone.

import { makeRecord, toNumber, cleanItemName, normalizeUnit } from './groceryModel';

export const LEGACY_HEADER = ['Date', 'Item', 'Weight/Count', 'Unit', 'Value', 'Rate', 'Unit'];

export const NORMALIZED_HEADER = [
  'Date', 'Item', 'Quantity', 'Unit', 'Value', 'Rate', 'RateUnit', 'Category', 'Store', 'Notes',
];

/** Minimal RFC4180 reader — handles quoted fields, embedded commas and CRLF. */
export const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const input = String(text ?? '').replace(/^\uFEFF/, '');

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += char;
      continue;
    }
    if (char === '"') { inQuotes = true; continue; }
    if (char === ',') { row.push(field); field = ''; continue; }
    if (char === '\r') continue;
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += char;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }

  return rows.filter((cells) => cells.some((cell) => String(cell).trim() !== ''));
};

const pad = (num) => String(num).padStart(2, '0');

/**
 * The sheet is written month-first (`11-13-2025`), but ISO and day-first inputs
 * are accepted too so a re-imported export or a copy-paste still lands.
 */
export const parseDate = (raw) => {
  const value = String(raw ?? '').trim();
  if (!value) return null;

  const parts = value.split(/[-/.]/).map((part) => part.trim());
  if (parts.length !== 3 || parts.some((part) => part === '' || !/^\d+$/.test(part))) return null;

  let year;
  let month;
  let day;
  if (parts[0].length === 4) {
    [year, month, day] = parts.map(Number);
  } else {
    const [first, second, third] = parts.map(Number);
    year = third;
    if (first > 12 && second <= 12) { day = first; month = second; } else { month = first; day = second; }
  }

  if (!year || !month || !day) return null;
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  return `${year}-${pad(month)}-${pad(day)}`;
};

export const toSheetDate = (isoDate) => {
  const parts = String(isoDate ?? '').split('-');
  if (parts.length !== 3) return String(isoDate ?? '');
  return `${parts[1]}-${parts[2]}-${parts[0]}`;
};

const HEADER_SYNONYMS = {
  date: 'date', purchasedate: 'date',
  item: 'item', name: 'item', product: 'item',
  quantity: 'quantity', qty: 'quantity', 'weight/count': 'quantity', weight: 'quantity', count: 'quantity',
  unit: 'unit',
  value: 'value', amount: 'value', total: 'value', price: 'value',
  rate: 'rate', unitrate: 'rate',
  rateunit: 'rateUnit',
  category: 'category',
  store: 'store', shop: 'store', vendor: 'store',
  notes: 'notes', note: 'notes', comment: 'notes', remarks: 'notes',
};

const normalizeHeaderCell = (cell) => String(cell ?? '').trim().toLowerCase().replace(/\s+/g, '');

const looksLikeHeader = (cells) => cells.some((cell) => HEADER_SYNONYMS[normalizeHeaderCell(cell)]);

/** Maps a header row to field names; the second bare "Unit" becomes the rate unit. */
export const mapHeader = (cells) => {
  const mapping = {};
  let unitSeen = false;
  cells.forEach((cell, index) => {
    const field = HEADER_SYNONYMS[normalizeHeaderCell(cell)];
    if (!field) return;
    if (field === 'unit') {
      const target = unitSeen ? 'rateUnit' : 'unit';
      unitSeen = true;
      if (mapping[target] === undefined) mapping[target] = index;
      return;
    }
    if (mapping[field] === undefined) mapping[field] = index;
  });
  return mapping;
};

const POSITIONAL_MAPPING = { date: 0, item: 1, quantity: 2, unit: 3, value: 4, rate: 5, rateUnit: 6 };

/**
 * Converts raw CSV rows into grocery records.
 * Rows that cannot yield a date, item and amount are reported instead of guessed.
 */
export const rowsToRecords = (rows) => {
  const records = [];
  const errors = [];
  if (rows.length === 0) return { records, errors, total: 0 };

  const hasHeader = looksLikeHeader(rows[0]);
  const mapping = hasHeader ? mapHeader(rows[0]) : POSITIONAL_MAPPING;
  const resolved = { ...POSITIONAL_MAPPING, ...mapping };
  const dataRows = hasHeader ? rows.slice(1) : rows;

  dataRows.forEach((cells, index) => {
    const line = index + (hasHeader ? 2 : 1);
    const at = (field) => (resolved[field] === undefined ? '' : cells[resolved[field]] ?? '');

    const date = parseDate(at('date'));
    const item = cleanItemName(at('item'));
    const quantity = toNumber(at('quantity'));
    const value = toNumber(at('value'));
    const rate = toNumber(at('rate'));
    const unit = normalizeUnit(at('unit'));

    const reasons = [];
    if (!date) reasons.push('unreadable date');
    if (!item) reasons.push('missing item');
    if (value === null && !(quantity !== null && rate !== null)) reasons.push('missing value');
    if (quantity === null && !(value !== null && rate)) reasons.push('missing quantity');

    if (reasons.length > 0) {
      errors.push({ line, reason: reasons.join(', '), raw: cells.join(', ') });
      return;
    }

    records.push(makeRecord({
      date,
      item,
      quantity,
      unit,
      value,
      rate,
      rateUnit: normalizeUnit(at('rateUnit')) || unit,
      category: String(at('category') || '').trim() || undefined,
      store: at('store'),
      notes: at('notes'),
    }));
  });

  return { records, errors, total: dataRows.length };
};

export const parseGroceryCsv = (text) => rowsToRecords(parseCsv(text));

// A leading =, +, - or @ turns a cell into a formula when the export is reopened
// in a spreadsheet, so text fields are neutralised on the way out.
const escapeCell = (value) => {
  let cell = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(cell) && Number.isNaN(Number(cell))) cell = `'${cell}`;
  if (/[",\n\r]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
  return cell;
};

const toCsv = (rows) => rows.map((row) => row.map(escapeCell).join(',')).join('\n');

/** Round-trips into the manually maintained sheet's original 7-column layout. */
export const recordsToLegacyCsv = (records) => toCsv([
  LEGACY_HEADER,
  ...records.map((record) => [
    toSheetDate(record.date),
    record.item,
    record.quantity,
    record.unit,
    record.value,
    record.rate,
    record.rateUnit || record.unit,
  ]),
]);

export const recordsToNormalizedCsv = (records) => toCsv([
  NORMALIZED_HEADER,
  ...records.map((record) => [
    record.date,
    record.item,
    record.quantity,
    record.unit,
    record.value,
    record.rate,
    record.rateUnit || record.unit,
    record.category,
    record.store,
    record.notes,
  ]),
]);

export const recordsToTsv = (records, { includeHeader = true } = {}) => [
  ...(includeHeader ? [LEGACY_HEADER] : []),
  ...records.map((record) => [
    toSheetDate(record.date),
    record.item,
    record.quantity,
    record.unit,
    record.value,
    record.rate,
    record.rateUnit || record.unit,
  ]),
].map((row) => row.join('\t')).join('\n');
