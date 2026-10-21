// parseValidator.js - what the customer must send to have a message parsed.

import { z } from 'zod';

export const parseRequestSchema = z.object({
  message: z
    .string({ error: 'Type your order' })
    .trim()
    .min(1, 'Type your order')
    .max(1000, 'Message is too long (max 1000 characters)'), // also keeps LLM token use small
});
