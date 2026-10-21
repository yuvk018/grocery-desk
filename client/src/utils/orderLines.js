// orderLines.js - helpers for the lines on the customer's review screen.
//
// A "line" is one row the customer is reviewing:
//   { key, text, product, quantity, status, message, candidates, suggestion }
// The server sends the first version (from POST /api/orders/parse). After that the customer
// can change quantities, pick products, add or remove lines, and we re-check each line here
// so the screen updates instantly. The server checks everything AGAIN on confirm, so these
// browser checks are only for a friendly experience, not for safety.

import { quantity as formatQty } from './format.js';

const WHOLE_UNITS = ['piece', 'packet', 'dozen'];

// Every line needs a unique "key" so React can tell rows apart when they change.
let counter = 0;
const newKey = () => `line-${++counter}`;

// Products come in two shapes (catalog: _id, parse preview: id). Use one shape everywhere.
export function toProduct(p) {
  return { id: p.id ?? p._id, code: p.code, name: p.name, unit: p.unit, price: p.price, stock: p.stock };
}

// A line from the server's parse preview -> a line for the review screen.
export function fromPreviewLine(line) {
  return {
    key: newKey(),
    text: line.text,
    product: line.product ? toProduct(line.product) : null,
    quantity: line.quantity ?? null, // null for "invalid" lines: the customer must enter an amount
    serverStatus: line.status, // ambiguous / unmatched / invalid / ok / over_stock
    serverMessage: line.message ?? '',
    suggestion: line.suggestion ?? null,
    candidates: (line.candidates ?? []).map((c) => ({ product: toProduct(c.product), quantity: c.quantity })),
  };
}

// A line for a product the customer picked by hand.
export function fromProduct(product, quantity = 1) {
  return { key: newKey(), text: '', product: toProduct(product), quantity, serverStatus: 'ok', serverMessage: '', suggestion: null, candidates: [] };
}

// Work out what the line needs right now. Returns { status, message }.
//   ok         -> ready to order
//   ambiguous  -> pick one of the candidates
//   unmatched  -> not something we sell; remove it or pick a product
//   invalid    -> the amount isn't valid yet
//   over_stock -> more than we have
export function checkLine(line) {
  if (!line.product) {
    return line.serverStatus === 'ambiguous'
      ? { status: 'ambiguous', message: `Which one did you mean by “${line.text}”?` }
      : { status: 'unmatched', message: line.serverMessage || `We don't stock “${line.text}”.` };
  }

  const { product, quantity } = line;
  if (quantity === null || quantity === '' || Number.isNaN(Number(quantity))) {
    return { status: 'invalid', message: line.serverMessage || 'Enter how much you need.' };
  }
  const q = Number(quantity);
  if (q <= 0) return { status: 'invalid', message: 'Quantity must be more than 0.' };
  if (WHOLE_UNITS.includes(product.unit) && !Number.isInteger(q)) {
    return { status: 'invalid', message: `${product.name} is sold per ${product.unit}. Use a whole number.` };
  }
  if (product.stock <= 0) return { status: 'over_stock', message: `${product.name} is out of stock.` };
  if (q > product.stock) return { status: 'over_stock', message: `Only ${formatQty(product.stock, product.unit)} left.` };
  return { status: 'ok', message: '' };
}

// Price of one line (0 if it isn't ready yet). Rounded to paise.
export function lineTotal(line) {
  if (!line.product || !(Number(line.quantity) > 0)) return 0;
  return Math.round(Number(line.quantity) * line.product.price * 100) / 100;
}

// Step size for the − / + buttons: whole units for pieces/packets, half for kg/litre.
export function stepFor(unit) {
  return WHOLE_UNITS.includes(unit) ? 1 : 0.5;
}
