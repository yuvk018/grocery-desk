// Product.js - the shape of one product in the shop's catalog.
// A "model" is what we use to read and write a MongoDB collection (here: "products").

const mongoose = require('mongoose');

// The only units the assignment allows. Exported so other files (validation, unit conversion) reuse the same list.
const UNITS = ['kg', 'litre', 'piece', 'packet', 'dozen'];

const productSchema = new mongoose.Schema(
  {
    // Short ID from the assignment PDF (P01, P02...). Handy for tests and for the LLM prompt.
    code: { type: String, required: true, unique: true, trim: true },

    name: { type: String, required: true, trim: true },

    // "enum" means MongoDB will reject any unit not in the list above.
    unit: { type: String, required: true, enum: UNITS },

    // Price in rupees for ONE unit (e.g. ₹48 per kg of atta).
    price: { type: Number, required: true, min: 0 },

    // How many units are in stock. min: 0 stops stock being saved as a negative number.
    stock: { type: Number, required: true, min: 0 },

    // --- Extra fields we added (the PDF allows extra fields) ---

    // Other names customers use, e.g. "ande" for Eggs or "aloo" for Potato.
    // A generic word like "oil" is given to BOTH oils on purpose: if a word matches
    // more than one product, our code knows the request is ambiguous and asks the customer.
    aliases: { type: [String], default: [] },

    // Size of one pack, for products sold by the packet/piece. Example: Toned Milk is 500 ml,
    // so when a customer asks for "1 litre milk" we can work out that means 2 packets.
    // Products sold loose (kg, litre) leave this empty.
    packSize: {
      amount: { type: Number, min: 0 },
      unit: { type: String, enum: ['g', 'ml'] },
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
module.exports.UNITS = UNITS;
