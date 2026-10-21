// orderController.js - thin controller for everything under /api/orders.
// (Same idea as productController: read the request, call a service, send the result.)

import * as parseService from '../services/parseService.js';
import * as orderService from '../services/orderService.js';

// POST /api/orders/parse   body: { message: "2 kg atta aur ek dozen ande" }
// Returns a priced preview. Nothing is saved yet.
export async function parseOrder(req, res) {
  const preview = await parseService.parseOrderMessage(req.body);
  res.json(preview);
}

// POST /api/orders   body: { customerName, message, items: [{ productId, quantity }] }
// Confirms the order: reduces stock and saves it.
export async function confirmOrder(req, res) {
  const order = await orderService.confirmOrder(req.body);
  res.status(201).json(order);
}

// GET /api/orders   (shopkeeper: every order)
export async function getOrders(req, res) {
  const orders = await orderService.listOrders();
  res.json(orders);
}

// GET /api/orders/mine?customer=Ravi   (customer: their own past orders, for reorder)
export async function getMyOrders(req, res) {
  const orders = await orderService.listCustomerOrders(req.query);
  res.json(orders);
}

// PATCH /api/orders/:id/status   body: { status: "Packed" }
export async function updateStatus(req, res) {
  const order = await orderService.updateOrderStatus(req.params.id, req.body);
  res.json(order);
}
