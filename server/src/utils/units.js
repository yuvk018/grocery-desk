// units.js - turns "what the customer said" into "how many of the product's unit".
//
// Example: the customer says "500 gm moong dal". Moong Dal is sold per kg,
// so convertToProductUnit({ quantity: 500, unit: 'gm' }, moongDal) returns 0.5 (kg).
//
// This is plain code, NOT the LLM. The LLM only reports what the customer said
// ("500" and "gm"); our code does the maths. That keeps the result the same every time and easy to test.
// It never throws: it returns { ok: true, quantity } or { ok: false, error, message } so callers can flag the item.

// --- 1. Unit spellings -> one standard name ---
// Customers (and the LLM) write units in many ways. We map each spelling to one standard unit.
const UNIT_ALIASES = {
  kg: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms', 'kilogramme'],
  g: ['g', 'gm', 'gms', 'gram', 'grams', 'gramme', 'grm'],
  litre: ['l', 'ltr', 'ltrs', 'litre', 'litres', 'liter', 'liters', 'lit'],
  ml: ['ml', 'mls', 'millilitre', 'millilitres', 'milliliter', 'milliliters'],
  piece: ['piece', 'pieces', 'pc', 'pcs', 'nos', 'no', 'unit', 'units'],
  packet: ['packet', 'packets', 'pkt', 'pkts', 'pack', 'packs', 'pouch'],
  dozen: ['dozen', 'dozens', 'dz', 'darjan', 'darzan'],
};

// Build a quick lookup table: { kgs: 'kg', gm: 'g', ... }
const UNIT_LOOKUP = {};
for (const [standard, spellings] of Object.entries(UNIT_ALIASES)) {
  for (const spelling of spellings) UNIT_LOOKUP[spelling] = standard;
}

// What kind of measurement each standard unit is, and its size in the base unit of that kind.
// weight base = gram, volume base = millilitre, count base = 1 item.
const UNIT_INFO = {
  g: { kind: 'weight', size: 1 },
  kg: { kind: 'weight', size: 1000 },
  ml: { kind: 'volume', size: 1 },
  litre: { kind: 'volume', size: 1000 },
  piece: { kind: 'count', size: 1 },
  packet: { kind: 'count', size: 1 },
  dozen: { kind: 'count', size: 12 },
};

// --- 2. Number words -> numbers ---
// Covers Hindi (in Roman script) and English words, e.g. "ek dozen", "aadha kilo", "dedh litre".
const NUMBER_WORDS = {
  half: 0.5, aadha: 0.5, adha: 0.5, aadhi: 0.5, adhi: 0.5,
  quarter: 0.25, paav: 0.25, pav: 0.25, pao: 0.25,
  dedh: 1.5, dhed: 1.5, dhai: 2.5, dhaai: 2.5, adhai: 2.5,
  one: 1, ek: 1, two: 2, do: 2, three: 3, teen: 3, four: 4, char: 4, chaar: 4,
  five: 5, paanch: 5, panch: 5, six: 6, chhe: 6, che: 6, seven: 7, saat: 7,
  eight: 8, aath: 8, nine: 9, nau: 9, ten: 10, das: 10,
};

// Turn a quantity (number, "2", "1.5", "ek", "half") into a number. Returns NaN if we can't understand it.
export function parseQuantity(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;

  const text = value.trim().toLowerCase();
  if (text in NUMBER_WORDS) return NUMBER_WORDS[text];
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text); // plain numbers only, so "2abc" is rejected
  return NaN;
}

// Turn a unit spelling into a standard unit ("Kgs" -> "kg"). Returns null if unknown.
export function normalizeUnit(unit) {
  if (typeof unit !== 'string') return null;
  return UNIT_LOOKUP[unit.trim().toLowerCase()] || null;
}

// Round away tiny floating point errors, e.g. 0.1 + 0.2 = 0.30000000000000004 -> 0.3
function round(n) {
  return Math.round(n * 1000) / 1000;
}

function fail(error, message, extra = {}) {
  return { ok: false, error, message, ...extra };
}

// --- 3. The main function ---
// requested: { quantity, unit } as the customer said it (unit may be empty, e.g. "6 eggs")
// product:   { name, unit, packSize? } from the database
export function convertToProductUnit(requested, product) {
  const quantity = parseQuantity(requested.quantity);

  // Rule: quantity must be a real number above zero. Catches "-1 kg potato" and garbage.
  if (!Number.isFinite(quantity)) {
    return fail('invalid_quantity', `Could not understand the quantity "${requested.quantity}"`);
  }
  if (quantity <= 0) {
    return fail('invalid_quantity', `Quantity must be more than 0 (got ${quantity})`);
  }

  // No unit given ("6 eggs", "1 bread") -> assume the product's own unit.
  const hasUnit = requested.unit !== undefined && requested.unit !== null && String(requested.unit).trim() !== '';
  const fromUnit = hasUnit ? normalizeUnit(requested.unit) : product.unit;
  if (!fromUnit) {
    return fail('unknown_unit', `Unknown unit "${requested.unit}"`);
  }

  const from = UNIT_INFO[fromUnit];
  const to = UNIT_INFO[product.unit];
  let result;

  if (from.kind === to.kind) {
    // Same kind of measurement (weight->weight, volume->volume, count->count): just scale.
    // For count, piece and packet are treated the same ("2 packet butter" = 2 butters),
    // and a dozen is 12 of them.
    result = (quantity * from.size) / to.size;
  } else if (to.kind === 'count' && product.packSize && product.packSize.amount) {
    // Product is sold in packs of a fixed size, e.g. Toned Milk = 500 ml packet.
    // "1 litre milk" -> 1000 ml / 500 ml = 2 packets.
    const packKind = UNIT_INFO[product.packSize.unit].kind;
    if (from.kind !== packKind) {
      return fail('unit_mismatch', `"${requested.unit}" doesn't fit ${product.name} (sold per ${product.unit})`);
    }
    result = (quantity * from.size) / product.packSize.amount;
  } else {
    // Different kinds and no way to convert, e.g. "3 litre eggs" or "2 dozen atta".
    return fail('unit_mismatch', `"${requested.unit}" doesn't fit ${product.name} (sold per ${product.unit})`);
  }

  result = round(result);

  // Pieces and packets can't be split: "300 g tea" with 250 g packets is 1.2 packets.
  // We don't silently round; we flag it and suggest the nearest whole number instead.
  if (to.kind === 'count' && !Number.isInteger(result)) {
    const suggestion = Math.max(1, Math.round(result));
    return fail(
      'not_whole',
      `${product.name} is sold per ${product.unit}; that works out to ${result}. Did you mean ${suggestion}?`,
      { suggestion }
    );
  }

  return { ok: true, quantity: result, unit: product.unit };
}
