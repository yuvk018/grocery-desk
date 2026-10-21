// parseService.js - turns a customer's text message into a priced PREVIEW of their order.
//
// The flow:
//   message -> LLM (llmService) says what the customer probably meant
//           -> OUR code checks every item against the database:
//                1. match:   does the product really exist? one product, several (ambiguous), or none?
//                2. convert: turn "2 kilo" / "ek dozen" / "500 gm" into the product's unit (units.js)
//                3. price:   unit price ALWAYS comes from the database, never from the LLM
//                4. stock:   flag anything above the available stock and suggest the maximum
//
// Nothing is saved here and stock is not touched. The customer reviews this preview,
// fixes any flagged lines, and only then confirms (orderService, next step).
//
// Each line has a status the review screen uses:
//   ok         -> matched, converted, priced, in stock
//   ambiguous  -> could be several products ("oil"), customer must pick one
//   unmatched  -> we don't sell it ("dhaniya") or couldn't identify it, customer removes it
//   invalid    -> product found but the amount doesn't make sense ("3 litre eggs", "-1 kg")
//   over_stock -> more than we have; shows the maximum available

import { listProducts } from './productService.js';
import { extractOrderItems } from './llmService.js';
import { convertToProductUnit } from '../utils/units.js';
import { parseRequestSchema } from '../validators/parseValidator.js';
// Money is rounded to 2 decimal places (paise), e.g. 0.5 kg x ₹62 = ₹31.
const roundMoney = (n) => Math.round(n * 100) / 100;

// The product fields the customer screen needs (no internal fields like aliases).
function summarize(product) {
  return {
    id: product._id.toString(),
    code: product.code,
    name: product.name,
    unit: product.unit,
    price: product.price,
    stock: product.stock,
  };
}

// Step 1 + 2 for one item from the LLM: match it to a product, then convert the amount.
function buildLine(item, productsByCode) {
  const requested = { quantity: item.quantity, unit: item.unit };
  const base = { text: item.text, requested };

  // Which real products could this be? Trust the LLM's code only if it exists in OUR database
  // (an LLM can invent codes like "P99"). Otherwise look at its candidates, again keeping only real ones.
  const sure = productsByCode.get(item.productCode);
  const options = sure ? [sure] : item.candidates.map((code) => productsByCode.get(code)).filter(Boolean);

  if (options.length === 0) {
    return { ...base, status: 'unmatched', message: `We couldn't find "${item.text}" in our shop` };
  }

  if (options.length > 1) {
    // Ambiguous: show each possible product, with the amount already converted for it,
    // so when the customer picks one the quantity is ready ("2 packet doodh" -> 2 packets of either milk).
    return {
      ...base,
      status: 'ambiguous',
      message: `"${item.text}" could be more than one product. Please pick one.`,
      candidates: options.map((product) => {
        const conversion = convertToProductUnit(requested, product);
        return { product: summarize(product), quantity: conversion.ok ? conversion.quantity : null };
      }),
    };
  }

  // Exactly one product: convert the amount to the product's unit.
  const product = options[0];
  if (item.quantity === null) {
    return { ...base, status: 'invalid', product: summarize(product), message: `How much ${product.name}? No exact amount was given.` };
  }

  const conversion = convertToProductUnit(requested, product);
  if (!conversion.ok) {
    return { ...base, status: 'invalid', product: summarize(product), message: conversion.message, suggestion: conversion.suggestion };
  }

  return { ...base, status: 'ok', product: summarize(product), quantity: conversion.quantity };
}

// If the same product appears twice ("1 kg sugar ... and 1 kg sugar"), combine into one line,
// so the stock check below sees the real total.
function mergeDuplicates(lines) {
  const merged = [];
  const okLineByProduct = new Map();

  for (const line of lines) {
    const existing = line.status === 'ok' && okLineByProduct.get(line.product.id);
    if (existing) {
      existing.quantity = Math.round((existing.quantity + line.quantity) * 1000) / 1000;
      existing.text += `, ${line.text}`;
    } else {
      merged.push(line);
      if (line.status === 'ok') okLineByProduct.set(line.product.id, line);
    }
  }
  return merged;
}

// Step 3 + 4: price the line from the database, and check stock.
function priceAndCheckStock(line) {
  if (line.status !== 'ok') return line;

  const { product, quantity } = line;
  const priced = { ...line, unitPrice: product.price, lineTotal: roundMoney(quantity * product.price) };

  if (quantity > product.stock) {
    return {
      ...priced,
      status: 'over_stock',
      maxAvailable: product.stock,
      message: `Only ${product.stock} ${product.unit} of ${product.name} available`,
    };
  }
  return priced;
}

// The main function. options.extract lets tests replace the real Gemini call with a fake one.
export async function parseOrderMessage(input, options = {}) {
  const { message } = parseRequestSchema.parse(input); // 400 if empty or too long
  const extract = options.extract ?? extractOrderItems;

  const products = await listProducts();
  const llm = await extract(message, products);

  // Rule 1: the LLM is slow, down or returned garbage -> tell the customer and switch to manual ordering.
  if (!llm.ok) {
    return {
      source: 'manual',
      message,
      llmError: `${llm.message} Please build your order by picking products from the list.`,
      isOrder: true,
      lines: [],
      total: 0,
      note: '',
    };
  }

  const productsByCode = new Map(products.map((p) => [p.code, p]));
  const lines = mergeDuplicates(llm.data.items.map((item) => buildLine(item, productsByCode))).map(priceAndCheckStock);

  // The total only counts lines that are ready to order. Flagged lines must be fixed first.
  const total = roundMoney(lines.filter((l) => l.status === 'ok').reduce((sum, l) => sum + l.lineTotal, 0));

  return {
    source: 'llm',
    message,
    isOrder: llm.data.isOrder,
    lines,
    total,
    note: llm.data.isOrder ? llm.data.note : llm.data.note || 'This desk only takes grocery orders.',
  };
}
