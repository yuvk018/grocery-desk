// units.test.js - tests for unit conversion (one of the test areas the assignment asks for).
// Run with:  npm test   (from the server folder)
//
// These tests use plain product objects copied from the catalog, so they need no database.

import { convertToProductUnit, parseQuantity, normalizeUnit } from '../src/utils/units.js';
import catalog from '../src/seed/catalog.js';

// Helper: get a product from the seed catalog by its code, e.g. product('P10') -> Eggs
const product = (code) => catalog.find((p) => p.code === code);

describe('parseQuantity', () => {
  test('reads numbers and numeric strings', () => {
    expect(parseQuantity(2)).toBe(2);
    expect(parseQuantity('1.5')).toBe(1.5);
  });

  test('reads Hindi and English number words', () => {
    expect(parseQuantity('ek')).toBe(1);
    expect(parseQuantity('half')).toBe(0.5);
    expect(parseQuantity('aadha')).toBe(0.5);
    expect(parseQuantity('dedh')).toBe(1.5);
  });

  test('returns NaN for garbage', () => {
    expect(parseQuantity('thoda')).toBeNaN(); // "a little" has no exact amount
    expect(parseQuantity('2abc')).toBeNaN();
    expect(parseQuantity(null)).toBeNaN();
  });
});

describe('normalizeUnit', () => {
  test('maps spellings to a standard unit', () => {
    expect(normalizeUnit('Kilo')).toBe('kg');
    expect(normalizeUnit('gm')).toBe('g');
    expect(normalizeUnit('ltr')).toBe('litre');
    expect(normalizeUnit('packets')).toBe('packet');
    expect(normalizeUnit('pcs')).toBe('piece');
  });

  test('returns null for unknown units', () => {
    expect(normalizeUnit('bucket')).toBeNull();
  });
});

describe('convertToProductUnit: examples from the assignment', () => {
  test('"half kg" toor dal -> 0.5 kg', () => {
    expect(convertToProductUnit({ quantity: 'half', unit: 'kg' }, product('P04'))).toMatchObject({ ok: true, quantity: 0.5 });
  });

  test('"500 gm" moong dal -> 0.5 kg', () => {
    expect(convertToProductUnit({ quantity: 500, unit: 'gm' }, product('P05'))).toMatchObject({ ok: true, quantity: 0.5 });
  });

  test('"1.5 litre" mustard oil -> 1.5 litre', () => {
    expect(convertToProductUnit({ quantity: 1.5, unit: 'litre' }, product('P14'))).toMatchObject({ ok: true, quantity: 1.5 });
  });

  test('"ek dozen" eggs -> 12 pieces', () => {
    expect(convertToProductUnit({ quantity: 'ek', unit: 'dozen' }, product('P10'))).toMatchObject({ ok: true, quantity: 12 });
  });

  test('"2 packet" toned milk -> 2 packets', () => {
    expect(convertToProductUnit({ quantity: 2, unit: 'packet' }, product('P08'))).toMatchObject({ ok: true, quantity: 2 });
  });

  test('"2 kilo" atta -> 2 kg', () => {
    expect(convertToProductUnit({ quantity: 2, unit: 'kilo' }, product('P01'))).toMatchObject({ ok: true, quantity: 2 });
  });
});

describe('convertToProductUnit: pack sizes', () => {
  test('"1 litre" toned milk (500 ml packets) -> 2 packets', () => {
    expect(convertToProductUnit({ quantity: 1, unit: 'litre' }, product('P08'))).toMatchObject({ ok: true, quantity: 2 });
  });

  test('"250g" tea (250 g packets) -> 1 packet', () => {
    expect(convertToProductUnit({ quantity: 250, unit: 'g' }, product('P16'))).toMatchObject({ ok: true, quantity: 1 });
  });

  test('"300 g" tea is not a whole number of packets -> flagged with a suggestion', () => {
    const result = convertToProductUnit({ quantity: 300, unit: 'g' }, product('P16'));
    expect(result).toMatchObject({ ok: false, error: 'not_whole', suggestion: 1 });
  });

  test('"1 litre" bread (sold by weight packs) -> mismatch', () => {
    expect(convertToProductUnit({ quantity: 1, unit: 'litre' }, product('P11'))).toMatchObject({ ok: false, error: 'unit_mismatch' });
  });
});

describe('convertToProductUnit: no unit given uses the product unit', () => {
  test('"6 eggs" -> 6 pieces', () => {
    expect(convertToProductUnit({ quantity: 6, unit: '' }, product('P10'))).toMatchObject({ ok: true, quantity: 6 });
  });

  test('"1 bread" -> 1 packet', () => {
    expect(convertToProductUnit({ quantity: 1 }, product('P11'))).toMatchObject({ ok: true, quantity: 1 });
  });

  test('"2 packet butter" (butter is per piece) -> 2 pieces', () => {
    expect(convertToProductUnit({ quantity: 2, unit: 'packet' }, product('P12'))).toMatchObject({ ok: true, quantity: 2 });
  });
});

describe('convertToProductUnit: things that must be flagged', () => {
  test('"3 litre eggs" -> unit mismatch', () => {
    const result = convertToProductUnit({ quantity: 3, unit: 'litre' }, product('P10'));
    expect(result).toMatchObject({ ok: false, error: 'unit_mismatch' });
    expect(result.message).toMatch(/Eggs/);
  });

  test('"2 dozen atta" -> unit mismatch', () => {
    expect(convertToProductUnit({ quantity: 2, unit: 'dozen' }, product('P01'))).toMatchObject({ ok: false, error: 'unit_mismatch' });
  });

  test('"-1 kg potato" -> invalid quantity', () => {
    expect(convertToProductUnit({ quantity: -1, unit: 'kg' }, product('P18'))).toMatchObject({ ok: false, error: 'invalid_quantity' });
  });

  test('0 quantity -> invalid quantity', () => {
    expect(convertToProductUnit({ quantity: 0, unit: 'kg' }, product('P18'))).toMatchObject({ ok: false, error: 'invalid_quantity' });
  });

  test('"thoda dhaniya" (no number) -> invalid quantity', () => {
    expect(convertToProductUnit({ quantity: 'thoda', unit: '' }, product('P18'))).toMatchObject({ ok: false, error: 'invalid_quantity' });
  });

  test('unknown unit -> flagged', () => {
    expect(convertToProductUnit({ quantity: 1, unit: 'bucket' }, product('P18'))).toMatchObject({ ok: false, error: 'unknown_unit' });
  });

  test('1.5 eggs -> not a whole number', () => {
    expect(convertToProductUnit({ quantity: 1.5, unit: 'piece' }, product('P10'))).toMatchObject({ ok: false, error: 'not_whole' });
  });

  test('half dozen eggs -> 6 pieces (fine)', () => {
    expect(convertToProductUnit({ quantity: 'half', unit: 'dozen' }, product('P10'))).toMatchObject({ ok: true, quantity: 6 });
  });
});
