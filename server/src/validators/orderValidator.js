// orderValidator.js - what the client must send to confirm an order or change its status.

import { z } from 'zod';
import { ORDER_STATUSES } from '../models/Order.js';

// Confirming an order. Notice what is NOT here: no prices, no totals, no product names.
// The client only says WHICH products and HOW MUCH; everything else is looked up in the database,
// so a tampered request can't change what the customer pays.
export const confirmOrderSchema = z.object({
  customerName: z.string({ error: 'Enter your name' }).trim().min(1, 'Enter your name').max(60),
  message: z.string().trim().max(1000).default(''), // the original text (empty if built manually)
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product is required'),
        quantity: z.coerce.number().positive('Quantity must be more than 0'),
      })
    )
    .min(1, 'Add at least one item')
    .max(50),
});

export const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` }),
});

// GET /api/orders/mine?customer=Ravi  (a customer's past orders, used for reorder)
export const customerOrdersSchema = z.object({
  customer: z.string({ error: 'Enter your name' }).trim().min(1, 'Enter your name').max(60),
});
