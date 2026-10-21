// orderRoutes.js - URLs under /api/orders.
// Parsing lives here too because it's the first step of placing an order.
//
// Customers (no login): parse a message, confirm an order, see their own past orders.
// Shopkeeper (login):   see ALL orders and change their status.

import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import requireShopkeeper from '../middleware/requireShopkeeper.js';

const router = Router();

router.post('/parse', orderController.parseOrder); // message -> priced preview (no saving)
router.post('/', orderController.confirmOrder); // confirm: reduce stock + save
router.get('/mine', orderController.getMyOrders); // ?customer=Ravi -> that customer's orders (for reorder)
router.get('/', requireShopkeeper, orderController.getOrders); // all orders, newest first
router.patch('/:id/status', requireShopkeeper, orderController.updateStatus); // New -> Packed -> Delivered, or Cancelled

export default router;
