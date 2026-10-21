// productValidator.js - rules for what a valid product looks like when the shopkeeper adds or edits one.
//
// We use Zod: we describe the shape once, then call schema.parse(data).
// parse() returns clean data (trimmed, numbers converted) or throws a ZodError
// that our error handler turns into a 400 response listing each problem.

import { z } from 'zod';
import { UNITS } from '../models/Product.js';

const packSizeSchema = z.object({
  amount: z.coerce.number().positive('Pack size must be more than 0'),
  unit: z.enum(['g', 'ml']),
});

// Rules for creating a product. "coerce" turns "48" (text from a form) into 48 (number).
export const createProductSchema = z.object({
  // Optional: if the shopkeeper leaves it out, the service picks the next free code (P21, P22...).
  code: z.string().trim().regex(/^P\d+$/, 'Code must look like P21').optional(),
  name: z.string().trim().min(1, 'Name is required'),
  unit: z.enum(UNITS, { error: `Unit must be one of: ${UNITS.join(', ')}` }),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  stock: z.coerce.number().min(0, 'Stock cannot be negative'),
  // Aliases are stored lowercase so matching later doesn't depend on capital letters.
  aliases: z.array(z.string().trim().toLowerCase().min(1)).default([]),
  packSize: packSizeSchema.optional(),
});

// Rules for editing: same fields, but every one is optional (send only what changes).
// The code is left out on purpose: a product's code never changes.
export const updateProductSchema = createProductSchema
  .omit({ code: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Send at least one field to update');
