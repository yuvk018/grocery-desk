// productService.js - all business logic for the product catalog.
//
// This is the "service layer": the ONLY place that talks to the Product model (the database).
// Controllers call these functions; they never use Product directly.
// Benefit: if the rules change (e.g. "codes must be unique"), there's one place to change them,
// and other services (like order parsing) can reuse the same functions.

import mongoose from 'mongoose';
import Product from '../models/Product.js';
import AppError from '../utils/AppError.js';import { createProductSchema, updateProductSchema } from '../validators/productValidator.js';

// Get every product, sorted by code (P01, P02, ...).
export async function listProducts() {
  return Product.find().sort({ code: 1 });
}

// Get one product, or throw a 404 if it doesn't exist.
export async function getProductById(id) {
  // An ID that isn't even in MongoDB's format can't exist, so answer 404 straight away.
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'Product not found');

  const product = await Product.findById(id);
  if (!product) throw new AppError(404, 'Product not found');
  return product;
}

// Work out the next free product code: if the highest is P20, return P21.
async function nextProductCode() {
  const products = await Product.find({}, { code: 1 });
  const highest = products.reduce((max, p) => Math.max(max, Number(p.code.slice(1)) || 0), 0);
  return `P${String(highest + 1).padStart(2, '0')}`;
}

export async function createProduct(input) {
  const data = createProductSchema.parse(input); // throws ZodError -> 400 if invalid
  if (!data.code) data.code = await nextProductCode();
  return Product.create(data);
}

export async function updateProduct(id, input) {
  const data = updateProductSchema.parse(input);
  const product = await getProductById(id); // throws 404 if missing

  Object.assign(product, data); // copy the changed fields onto the product
  return product.save(); // save() runs the schema rules again (e.g. stock >= 0)
}

// Remove a product. Past orders are not affected, because each order item
// stores its own copy of the product name and price.
export async function deleteProduct(id) {
  const product = await getProductById(id);
  await product.deleteOne();
  return product;
}
