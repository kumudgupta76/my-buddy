// Domain rules for grocery purchase records: units, derived amounts, duplicate
// detection and the aggregations the insights/cleanup views are built from.

export const DATE_FORMAT = 'YYYY-MM-DD';

// Every alias seen in the manually maintained sheet maps onto a canonical unit
// so that filtering and per-item rate history don't fragment on spelling.
const UNIT_ALIASES = {
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilogram: 'kg', kilograms: 'kg',
  g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g',
  l: 'l', lt: 'l', ltr: 'l', ltrs: 'l', liter: 'l', litre: 'l', liters: 'l', litres: 'l',
  ml: 'ml',
  packet: 'packet', packets: 'packet', pack: 'packet', packs: 'packet', pkt: 'packet',
  piece: 'piece', pieces: 'piece', pc: 'piece', pcs: 'piece',
  set: 'set', sets: 'set',
  '4set': '4set',
  ladi: 'ladi',
  dozen: 'dozen',
  bottle: 'bottle', bottles: 'bottle',
  box: 'box', boxes: 'box',
};

export const UNIT_OPTIONS = [
  'kg', 'g', 'l', 'ml', 'packet', 'piece', 'set', '4set', 'ladi', 'dozen', 'bottle', 'box',
];

export const CATEGORY_OPTIONS = [
  'Grains & Pulses',
  'Spices & Condiments',
  'Oil & Ghee',
  'Dry Fruits',
  'Snacks & Biscuits',
  'Dairy',
  'Beverages',
  'Personal Care',
  'Household',
  'Other',
];

const CATEGORY_KEYWORDS = [
  ['Grains & Pulses', ['rice', 'dal', 'daal', 'chana', 'chaana', 'channa', 'arhar', 'aarhar', 'moong', 'moog', 'masoor', 'msoor', 'besan', 'suji', 'sugi', 'poha', 'atta', 'flour', 'soya', 'sabudaana', 'sabudana', 'otts', 'oats', 'cornflex', 'cornflakes', 'musele', 'muesli']],
  ['Spices & Condiments', ['jeera', 'daniya', 'rai', 'ajwain', 'mirch', 'namak', 'salt', 'haldi', 'aachar', 'achar', 'catchup', 'ketchup', 'masala']],
  ['Oil & Ghee', ['oil', 'ghee', 'refind', 'refined', 'sarson', 'vanaspati']],
  ['Dry Fruits', ['kaju', 'badam', 'pista', 'almond', 'cashew', 'kishmish', 'raisin', 'makhana', 'trail mix', 'peanut', 'walnut', 'akhrot']],
  ['Snacks & Biscuits', ['parle', 'biscuit', 'cookie', 'nutrichoic', 'nutri choice', 'nurti', 'haldiram', 'namkeen', 'bhujiya', 'boondi', 'mathari', 'chips', 'toast', 'rusk', 'maggi', 'macroni', 'macaroni', 'rajbhoog', 'sev', 'kurkure']],
  ['Dairy', ['milk', 'paneer', 'curd', 'dahi', 'butter', 'cheese', 'amul']],
  ['Beverages', ['tea', 'chai', 'coffee', 'juice', 'horlicks', 'bournvita']],
  ['Personal Care', ['shampoo', 'shoulder', 'soap', 'toothpaste', 'dant kanti', 'mamaearth', 'clean and clear', 'cream', 'lotion', 'eno', 'handwash']],
  ['Household', ['surf', 'vim', 'rin', 'detergent', 'harpic', 'lizol', 'phenyl', 'broom', 'garbage', 'agarbatti']],
];

export const normalizeUnit = (unit) => {
  const raw = String(unit ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (!raw) return '';
  return UNIT_ALIASES[raw] || raw;
};

// Display form keeps the user's own spelling out of the way but stays readable.
export const cleanItemName = (name) => String(name ?? '').replace(/\s+/g, ' ').trim();

// Key used for grouping the same product written slightly differently.
export const itemKeyOf = (name) => cleanItemName(name).toLowerCase();

export const guessCategory = (name) => {
  const key = itemKeyOf(name);
  if (!key) return 'Other';
  const hit = CATEGORY_KEYWORDS.find(([, words]) => words.some((w) => key.includes(w)));
  return hit ? hit[0] : 'Other';
};

export const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value ?? '').replace(/[₹,\s]/g, '');
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const newId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const round = (num, places = 2) => {
  if (num === null || !Number.isFinite(num)) return null;
  const factor = 10 ** places;
  return Math.round(num * factor) / factor;
};

/**
 * Fills in whichever of quantity / value / rate is missing from the other two.
 * Nothing already supplied is overwritten — receipts often disagree with the
 * arithmetic and the sheet is the source of truth.
 */
export const deriveAmounts = ({ quantity, value, rate }) => {
  let q = toNumber(quantity);
  let v = toNumber(value);
  let r = toNumber(rate);

  if (q && v !== null && (r === null || r === 0)) r = round(v / q, 4);
  else if (q !== null && r && (v === null)) v = round(q * r);
  else if (v !== null && r && (q === null || q === 0)) q = round(v / r, 4);

  return { quantity: q, value: v, rate: r };
};

export const RATE_TOLERANCE = 0.02;

export const hasRateMismatch = (record) => {
  const { quantity, value, rate } = record;
  if (!Number.isFinite(quantity) || !Number.isFinite(value) || !Number.isFinite(rate)) return false;
  if (quantity <= 0 || rate <= 0) return false;
  const expected = quantity * rate;
  return Math.abs(expected - value) > Math.max(1, Math.abs(value) * RATE_TOLERANCE);
};

export const isIncomplete = (record) => (
  !record.item
  || !record.date
  || !Number.isFinite(record.value)
  || !Number.isFinite(record.quantity)
  || record.quantity <= 0
  || !record.unit
);

export const makeRecord = (input = {}) => {
  const amounts = deriveAmounts(input);
  const item = cleanItemName(input.item);
  const unit = normalizeUnit(input.unit);
  const now = new Date().toISOString();
  return {
    id: input.id || newId(),
    date: input.date || '',
    item,
    quantity: amounts.quantity,
    unit,
    value: amounts.value,
    rate: amounts.rate,
    rateUnit: normalizeUnit(input.rateUnit) || unit,
    category: input.category || guessCategory(item),
    store: cleanItemName(input.store),
    notes: String(input.notes ?? '').trim(),
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
};

// Two rows are treated as the same purchase when the whole line matches.
export const duplicateKeyOf = (record) => [
  record.date,
  itemKeyOf(record.item),
  record.quantity,
  normalizeUnit(record.unit),
  record.value,
].join('|');

export const splitDuplicates = (records) => {
  const seen = new Set();
  const unique = [];
  const duplicates = [];
  records.forEach((record) => {
    const key = duplicateKeyOf(record);
    if (seen.has(key)) duplicates.push(record);
    else {
      seen.add(key);
      unique.push(record);
    }
  });
  return { unique, duplicates };
};

export const findDuplicatesAgainst = (existing, incoming) => {
  const keys = new Set(existing.map(duplicateKeyOf));
  const fresh = [];
  const duplicates = [];
  incoming.forEach((record) => {
    const key = duplicateKeyOf(record);
    if (keys.has(key)) duplicates.push(record);
    else {
      keys.add(key);
      fresh.push(record);
    }
  });
  return { fresh, duplicates };
};

export const sortByDateDesc = (records) => [...records].sort((a, b) => {
  if (a.date === b.date) return String(a.item).localeCompare(String(b.item));
  return String(b.date).localeCompare(String(a.date));
});

export const formatCurrency = (amount) => {
  if (!Number.isFinite(amount)) return '—';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const formatQuantity = (record) => {
  if (!Number.isFinite(record.quantity)) return '—';
  return `${record.quantity} ${record.unit || ''}`.trim();
};

export const monthOf = (date) => String(date || '').slice(0, 7);

export const computeSummary = (records) => {
  const totalSpend = records.reduce((sum, r) => sum + (Number.isFinite(r.value) ? r.value : 0), 0);
  const trips = new Set(records.map((r) => r.date).filter(Boolean));
  const items = new Set(records.map((r) => itemKeyOf(r.item)).filter(Boolean));
  return {
    rows: records.length,
    totalSpend: round(totalSpend),
    trips: trips.size,
    uniqueItems: items.size,
    avgPerTrip: trips.size ? round(totalSpend / trips.size) : 0,
  };
};

export const monthlySpend = (records) => {
  const buckets = new Map();
  records.forEach((record) => {
    const month = monthOf(record.date);
    if (!month) return;
    const bucket = buckets.get(month) || { month, total: 0, rows: 0 };
    bucket.total += Number.isFinite(record.value) ? record.value : 0;
    bucket.rows += 1;
    buckets.set(month, bucket);
  });
  return [...buckets.values()]
    .map((b) => ({ ...b, key: b.month, total: round(b.total) }))
    .sort((a, b) => b.month.localeCompare(a.month));
};

export const categorySpend = (records) => {
  const buckets = new Map();
  records.forEach((record) => {
    const category = record.category || 'Other';
    const bucket = buckets.get(category) || { category, total: 0, rows: 0 };
    bucket.total += Number.isFinite(record.value) ? record.value : 0;
    bucket.rows += 1;
    buckets.set(category, bucket);
  });
  return [...buckets.values()]
    .map((b) => ({ ...b, key: b.category, total: round(b.total) }))
    .sort((a, b) => b.total - a.total);
};

/** Per-item roll-up including the latest rate and how it moved since last time. */
export const itemSummary = (records) => {
  const buckets = new Map();
  records.forEach((record) => {
    const key = itemKeyOf(record.item);
    if (!key) return;
    const bucket = buckets.get(key) || { key, item: record.item, rows: [], total: 0, times: 0 };
    bucket.rows.push(record);
    bucket.total += Number.isFinite(record.value) ? record.value : 0;
    bucket.times += 1;
    buckets.set(key, bucket);
  });

  return [...buckets.values()].map((bucket) => {
    const history = [...bucket.rows]
      .filter((r) => Number.isFinite(r.rate))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    const change = latest && previous && previous.rate
      ? round(((latest.rate - previous.rate) / previous.rate) * 100, 1)
      : null;
    return {
      key: bucket.key,
      item: bucket.item,
      times: bucket.times,
      total: round(bucket.total),
      latestRate: latest ? latest.rate : null,
      previousRate: previous ? previous.rate : null,
      latestDate: latest ? latest.date : null,
      unit: latest ? latest.unit : bucket.rows[0]?.unit,
      changePercent: change,
    };
  }).sort((a, b) => b.total - a.total);
};

export const priceHistory = (records, key) => records
  .filter((record) => itemKeyOf(record.item) === key)
  .sort((a, b) => String(a.date).localeCompare(String(b.date)))
  .map((record) => ({ ...record, key: record.id }));

/** Item names that differ only by case/spacing — candidates for merging. */
export const findAliasGroups = (records) => {
  const byKey = new Map();
  records.forEach((record) => {
    const key = itemKeyOf(record.item);
    if (!key) return;
    const variants = byKey.get(key) || new Map();
    variants.set(record.item, (variants.get(record.item) || 0) + 1);
    byKey.set(key, variants);
  });

  const groups = new Map();
  byKey.forEach((variants, key) => {
    const squashed = key.replace(/[^a-z0-9]/g, '');
    const group = groups.get(squashed) || { key: squashed, variants: new Map() };
    variants.forEach((count, name) => group.variants.set(name, (group.variants.get(name) || 0) + count));
    groups.set(squashed, group);
  });

  return [...groups.values()]
    .filter((group) => group.variants.size > 1)
    .map((group) => {
      const variants = [...group.variants.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      return { key: group.key, variants, suggested: variants[0].name, total: variants.reduce((s, v) => s + v.count, 0) };
    })
    .sort((a, b) => b.total - a.total);
};

/** Same item bought under different units — usually a typo in the sheet. */
export const findUnitConflicts = (records) => {
  const byItem = new Map();
  records.forEach((record) => {
    const key = itemKeyOf(record.item);
    if (!key || !record.unit) return;
    const units = byItem.get(key) || { key, item: record.item, units: new Set() };
    units.units.add(record.unit);
    byItem.set(key, units);
  });
  return [...byItem.values()]
    .filter((entry) => entry.units.size > 1)
    .map((entry) => ({ key: entry.key, item: entry.item, units: [...entry.units] }));
};

export const findIssues = (records) => {
  const { duplicates } = splitDuplicates(records);
  return {
    incomplete: records.filter(isIncomplete),
    rateMismatch: records.filter(hasRateMismatch),
    duplicates,
    unitConflicts: findUnitConflicts(records),
    aliasGroups: findAliasGroups(records),
  };
};

export const recalculateRate = (record) => {
  if (!Number.isFinite(record.quantity) || record.quantity <= 0 || !Number.isFinite(record.value)) return record;
  return { ...record, rate: round(record.value / record.quantity, 4), updatedAt: new Date().toISOString() };
};
