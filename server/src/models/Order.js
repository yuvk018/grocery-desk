// Order.js - the shape of a confirmed customer order (collection: "orders").

const mongoose = require('mongoose');

// The order's life cycle: New -> Packed -> Delivered, or Cancelled.
const ORDER_STATUSES = ['New', 'Packed', 'Delivered', 'Cancelled'];

// One line on the bill, e.g. "2 kg Wheat Atta @ ₹48 = ₹96".
// We COPY the name, unit and price here instead of only storing the product ID.
// Why? If the shopkeeper changes a price tomorrow, yesterday's bill must not change.
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // link to the product
    code: { type: String, required: true },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 }, // price at the moment of ordering
    quantity: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 }, // unitPrice x quantity
  },
  { _id: false } // items live inside the order, so they don't need their own IDs
);

const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },

    // Exactly what the customer typed. The dashboard shows it next to the parsed items,
    // so the shopkeeper can spot parsing mistakes. Empty if the order was built manually.
    originalMessage: { type: String, default: '' },

    items: {
      type: [orderItemSchema],
      // An order with no items makes no sense, so reject it.
      validate: { validator: (items) => items.length > 0, message: 'An order needs at least one item' },
    },

    total: { type: Number, required: true, min: 0 },

    status: { type: String, enum: ORDER_STATUSES, default: 'New' },
  },
  { timestamps: true } // createdAt lets the dashboard show newest orders first
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
