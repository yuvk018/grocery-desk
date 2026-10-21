// orderService.js - confirming orders, listing them, and moving them through their status.
//
// The two rules this file guarantees:
//   1. Stock only goes down when an order is CONFIRMED, and it can NEVER go below zero,
//      even if two customers confirm at the same moment.
//   2. Cancelling an order puts its items back in stock (exactly once).

import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import AppError from '../utils/AppError.js';import { confirmOrderSchema, updateStatusSchema, customerOrdersSchema } from '../validators/orderValidator.js';

const roundMoney = (n) => Math.round(n * 100) / 100;const roundQty = (n) => Math.round(n * 1000) / 1000;

// Units that can't be split: you can't buy 1.5 eggs or half a packet.
const WHOLE_UNITS = ['piece', 'packet', 'dozen'];

// ---------------------------------------------------------------------------
// Stock helpers
// ---------------------------------------------------------------------------

// Take `quantity` out of a product's stock, but ONLY if there is enough.
//
// This is ONE MongoDB command: "find this product WHERE stock >= quantity, and subtract quantity".
// MongoDB runs the check and the change together on the document, so no other request can sneak in
// between them. If two customers try to buy the last 5 paneer at the same moment, one command
// matches (stock 5 >= 5) and the other finds nothing (stock is now 0). Stock can't go below 0.
//
// The [ { $set: ... } ] form (an "update pipeline") lets us also round the result, so
// 50 - 0.3 is stored as 49.7 and not 49.699999999999996.
// Mongoose 9 asks us to switch pipelines on explicitly with { updatePipeline: true }.
const PIPELINE = { updatePipeline: true };

async function takeFromStock(productId, quantity) {
  const result = await Product.updateOne(
    { _id: productId, stock: { $gte: quantity } },
    [{ $set: { stock: { $round: [{ $subtract: ['$stock', quantity] }, 3] } } }],
    PIPELINE
  );
  return result.modifiedCount === 1; // true = we got the stock, false = not enough
}

// Put stock back (used when an order is cancelled, or to undo a half-finished confirm).
// If the product was deleted meanwhile, nothing matches and nothing happens.
async function returnToStock(productId, quantity) {
  await Product.updateOne(
    { _id: productId },
    [{ $set: { stock: { $round: [{ $add: ['$stock', quantity] }, 3] } } }],
    PIPELINE
  );
}

// ---------------------------------------------------------------------------
// Confirm
// ---------------------------------------------------------------------------

export async function confirmOrder(input) {
  const { customerName, message, items } = confirmOrderSchema.parse(input);

  // 1. Combine repeated products into one line ("2 atta" + "1 atta" -> "3 atta").
  const quantityById = new Map();
  for (const { productId, quantity } of items) {
    quantityById.set(productId, roundQty((quantityById.get(productId) || 0) + quantity));
  }

  // 2. Load the products from the database. Prices and names come from HERE, never from the client.
  const ids = [...quantityById.keys()];
  if (!ids.every((id) => mongoose.isValidObjectId(id))) throw new AppError(400, 'Unknown product in order');
  const products = await Product.find({ _id: { $in: ids } });
  if (products.length !== ids.length) throw new AppError(400, 'A product in your order is no longer available');

  // 3. Check each quantity makes sense for its product, and build the bill lines.
  const lines = products.map((product) => {
    const quantity = quantityById.get(product._id.toString());
    if (WHOLE_UNITS.includes(product.unit) && !Number.isInteger(quantity)) {
      throw new AppError(400, `${product.name} is sold per ${product.unit}; quantity must be a whole number`);
    }
    return {
      product: product._id,
      code: product.code,
      name: product.name,
      unit: product.unit,
      unitPrice: product.price,
      quantity,
      lineTotal: roundMoney(quantity * product.price),
    };
  });

  // 4. Reserve the stock, one product at a time, each with the safe "only if enough" command.
  //    If any product runs short, put back what we already took and reject the whole order,
  //    so the customer never gets half an order they didn't agree to.
  const taken = [];
  for (const line of lines) {
    if (await takeFromStock(line.product, line.quantity)) {
      taken.push(line);
      continue;
    }

    await Promise.all(taken.map((t) => returnToStock(t.product, t.quantity))); // undo
    const current = await Product.findById(line.product);
    const available = current ? current.stock : 0;
    throw new AppError(409, `Only ${available} ${line.unit} of ${line.name} left. Please reduce the quantity.`, {
      productId: line.product.toString(),
      available,
    });
  }

  // 5. All stock reserved -> save the order. If saving fails for some reason, give the stock back.
  try {
    return await Order.create({
      customerName,
      originalMessage: message,
      items: lines,
      total: roundMoney(lines.reduce((sum, l) => sum + l.lineTotal, 0)),
    });
  } catch (err) {
    await Promise.all(lines.map((l) => returnToStock(l.product, l.quantity)));
    throw err;
  }
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

// Escape characters like "." or "*" so a name is matched literally, not as a pattern.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// All orders, newest first (shopkeeper dashboard).
// _id breaks ties between orders placed in the same millisecond (ids always increase).
export async function listOrders() {
  return Order.find().sort({ createdAt: -1, _id: -1 });
}

// One customer's orders, newest first, matched by name ignoring capital letters.
export async function listCustomerOrders(query) {
  const { customer } = customerOrdersSchema.parse(query);
  return Order.find({ customerName: new RegExp(`^${escapeRegex(customer)}$`, 'i') }).sort({ createdAt: -1, _id: -1 });
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

// Which status each status may move to. Orders only move forward; Delivered and Cancelled are final.
const ALLOWED_NEXT = {
  New: ['Packed', 'Cancelled'],
  Packed: ['Delivered', 'Cancelled'],
  Delivered: [],
  Cancelled: [],
};

export async function updateOrderStatus(id, input) {
  const { status } = updateStatusSchema.parse(input);
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'Order not found');

  const order = await Order.findById(id);
  if (!order) throw new AppError(404, 'Order not found');

  if (!ALLOWED_NEXT[order.status].includes(status)) {
    throw new AppError(409, `Cannot change an order from ${order.status} to ${status}`);
  }

  // Change the status only if it is STILL what we just read. If the shopkeeper double-clicks
  // "Cancel", the second click finds the status already changed and does nothing,
  // so the items are never returned to stock twice.
  const updated = await Order.findOneAndUpdate(
    { _id: id, status: order.status },
    { $set: { status } },
    { returnDocument: 'after' }
  );
  if (!updated) throw new AppError(409, 'This order was just changed by someone else. Please refresh.');

  // Cancelling puts the items back on the shelf.
  if (status === 'Cancelled') {
    await Promise.all(updated.items.map((item) => returnToStock(item.product, item.quantity)));
  }

  return updated;
}
