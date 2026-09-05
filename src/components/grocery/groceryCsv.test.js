import {
  parseCsv,
  parseDate,
  toSheetDate,
  mapHeader,
  rowsToRecords,
  parseGroceryCsv,
  recordsToLegacyCsv,
  recordsToNormalizedCsv,
  recordsToTsv,
} from './groceryCsv';

const SHEET = [
  'Date,Item,Weight/Count,Unit,Value,Rate,Unit',
  '06-04-2025,Rice,5,Kg,500,100,Kg',
  '11-13-2025,Soya Bean,1,kg ,80,80,kg ',
  '10-17-2025,Moon Daal Namkeen,400,gm ,105,0,gm ',
].join('\n');

describe('parseCsv', () => {
  it('handles quoted fields, embedded commas and CRLF', () => {
    const rows = parseCsv('a,b\r\n"x,1","he said ""hi"""\r\n');
    expect(rows).toEqual([['a', 'b'], ['x,1', 'he said "hi"']]);
  });

  it('drops fully blank lines', () => {
    expect(parseCsv('a,b\n\n,\nc,d')).toEqual([['a', 'b'], ['c', 'd']]);
  });
});

describe('parseDate', () => {
  it('reads the sheet’s month-first format', () => {
    expect(parseDate('06-04-2025')).toBe('2025-06-04');
    expect(parseDate('10-9-2025')).toBe('2025-10-09');
  });

  it('accepts ISO and falls back to day-first when the month is impossible', () => {
    expect(parseDate('2025-11-13')).toBe('2025-11-13');
    expect(parseDate('13-11-2025')).toBe('2025-11-13');
  });

  it('rejects unparseable and impossible dates', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
    expect(parseDate('02-30-2025')).toBeNull();
  });

  it('round-trips back to the sheet format', () => {
    expect(toSheetDate(parseDate('06-04-2025'))).toBe('06-04-2025');
  });
});

describe('mapHeader', () => {
  it('sends the second duplicate "Unit" column to rateUnit', () => {
    expect(mapHeader(['Date', 'Item', 'Weight/Count', 'Unit', 'Value', 'Rate', 'Unit']))
      .toEqual({ date: 0, item: 1, quantity: 2, unit: 3, value: 4, rate: 5, rateUnit: 6 });
  });
});

describe('rowsToRecords', () => {
  it('parses the real sheet layout and normalises units', () => {
    const { records, errors, total } = parseGroceryCsv(SHEET);
    expect(total).toBe(3);
    expect(errors).toHaveLength(0);
    expect(records[0]).toMatchObject({ date: '2025-06-04', item: 'Rice', quantity: 5, unit: 'kg', value: 500, rate: 100 });
    expect(records[1].unit).toBe('kg');
    expect(records[2].unit).toBe('g');
  });

  it('derives the rate when only quantity and value are given', () => {
    const { records } = parseGroceryCsv('Date,Item,Weight/Count,Unit,Value,Rate,Unit\n01-02-2025,Dal,2,Kg,260,,Kg');
    expect(records[0].rate).toBe(130);
  });

  it('derives the value when only quantity and rate are given', () => {
    const { records } = parseGroceryCsv('Date,Item,Weight/Count,Unit,Value,Rate,Unit\n01-02-2025,Dal,2,Kg,,130,Kg');
    expect(records[0].value).toBe(260);
  });

  it('reports rather than guesses unusable rows', () => {
    const { records, errors } = parseGroceryCsv([
      'Date,Item,Weight/Count,Unit,Value,Rate,Unit',
      ',Rice,5,Kg,500,100,Kg',
      '06-04-2025,,5,Kg,500,100,Kg',
      '06-04-2025,Rice,,Kg,,,Kg',
    ].join('\n'));
    expect(records).toHaveLength(0);
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4]);
    expect(errors[0].reason).toContain('unreadable date');
    expect(errors[1].reason).toContain('missing item');
  });

  it('works on headerless rows using column position', () => {
    const { records } = rowsToRecords([['06-04-2025', 'Rice', '5', 'Kg', '500', '100', 'Kg']]);
    expect(records).toHaveLength(1);
    expect(records[0].item).toBe('Rice');
  });
});

describe('serialisers', () => {
  const { records } = parseGroceryCsv(SHEET);

  it('round-trips through the original 7-column layout', () => {
    const reparsed = parseGroceryCsv(recordsToLegacyCsv(records));
    expect(reparsed.errors).toHaveLength(0);
    expect(reparsed.records.map((r) => [r.date, r.item, r.quantity, r.value]))
      .toEqual(records.map((r) => [r.date, r.item, r.quantity, r.value]));
  });

  it('neutralises spreadsheet formula injection in text fields', () => {
    const csv = recordsToNormalizedCsv([{ ...records[0], item: '=cmd|calc', notes: '@SUM(A1)' }]);
    expect(csv).toContain("'=cmd|calc");
    expect(csv).toContain("'@SUM(A1)");
  });

  it('quotes fields containing commas', () => {
    const csv = recordsToNormalizedCsv([{ ...records[0], notes: 'a, b' }]);
    expect(csv).toContain('"a, b"');
  });

  it('emits tab-separated rows with a header', () => {
    const tsv = recordsToTsv(records.slice(0, 1));
    expect(tsv.split('\n')).toHaveLength(2);
    expect(tsv.split('\n')[1].split('\t')[1]).toBe('Rice');
  });
});
