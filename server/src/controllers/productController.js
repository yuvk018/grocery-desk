// productController.js - the "controller layer" for products.
//
// A controller is deliberately thin. Its only jobs are:
//   1. read what it needs from the request (req.params, req.body)
//   2. call the right service function
//   3. send the result back (res.json) with the right status code
// It contains no business rules and never touches the database.
// If the service throws, Express 5 sends the error to our errorHandler automatically.

import * as productService from '../services/productService.js';

// GET /api/products
export async function getProducts(req, res) {
  const products = await productService.listProducts();
  res.json(products);
}

// POST /api/products
export async function createProduct(req, res) {
  const product = await productService.createProduct(req.body);
  res.status(201).json(product); // 201 = "Created"
}

// PUT /api/products/:id
export async function updateProduct(req, res) {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json(product);
}

// DELETE /api/products/:id
export async function deleteProduct(req, res) {
  await productService.deleteProduct(req.params.id);
  res.status(204).end(); // 204 = "No Content": it worked, nothing to send back
}
