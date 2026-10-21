// llmOutputSchema.js - the exact shape we REQUIRE from the LLM's reply.
//
// We never trust what the LLM sends back. It might return broken JSON, extra text,
// wrong types, or something made up. So every reply goes through validateLlmOutput():
// if it doesn't match this schema, we treat it as "LLM returned garbage" (Rule 1)
// and the customer is offered manual ordering instead.
//
// The same schema is also turned into JSON Schema and sent to Gemini (see llmService.js),
// which tells Gemini what shape to answer in. One definition, used for both.

import { z } from 'zod';

// One thing the customer asked for, e.g. "2 kilo atta".
export const llmItemSchema = z.object({
  // The words from the message this item came from ("2 kilo atta"). Shown to the customer when flagged.
  text: z.string().min(1),

  // The catalog code the LLM thinks this is (e.g. "P01"), or null if unsure / not sold.
  productCode: z.string().nullable(),

  // When the item could be more than one product ("oil" -> P14 or P15), the possible codes.
  candidates: z.array(z.string()),

  // The number the customer said (2, 0.5, 500...), or null if no exact amount ("thoda dhaniya").
  // Not checked for > 0 here on purpose: "-1 kg potato" must reach our code so it can be FLAGGED, not hidden.
  quantity: z.number().nullable(),

  // The unit as the customer said it ("kilo", "gm", "dozen"), or null if they didn't say one ("6 eggs").
  unit: z.string().nullable(),
});

export const llmOrderSchema = z.object({
  // false when the message isn't an order at all ("hi, do you deliver on Sunday?")
  isOrder: z.boolean(),
  items: z.array(llmItemSchema).max(50), // a cap so a weird reply can't flood us
  // A short note for the customer, e.g. "We can't answer delivery questions here."
  note: z.string(),
});

// The same shape written as plain JSON Schema, sent to Gemini as "responseJsonSchema" so it
// answers in this format. We write it by hand because Gemini rejects some of the extras that
// z.toJSONSchema() generates (e.g. "type": ["string", "null"]); "anyOf" is what it accepts.
// This only ASKS Gemini for the shape. The Zod schema above is what actually CHECKS the reply.
const nullable = (type) => ({ anyOf: [{ type }, { type: 'null' }] });

export const llmOrderJsonSchema = {
  type: 'object',
  properties: {
    isOrder: { type: 'boolean' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          productCode: nullable('string'),
          candidates: { type: 'array', items: { type: 'string' } },
          quantity: nullable('number'),
          unit: nullable('string'),
        },
        required: ['text', 'productCode', 'candidates', 'quantity', 'unit'],
      },
    },
    note: { type: 'string' },
  },
  required: ['isOrder', 'items', 'note'],
};

// Check the raw text from the LLM. Never throws.
// Returns { ok: true, data } or { ok: false, error: 'why it was rejected' }.
export function validateLlmOutput(rawText) {
  if (typeof rawText !== 'string' || rawText.trim() === '') {
    return { ok: false, error: 'Empty reply from LLM' };
  }

  // Some models wrap JSON in ```json ... ``` even when asked not to. Strip that if present.
  const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: 'LLM reply is not valid JSON' };
  }

  const result = llmOrderSchema.safeParse(parsed); // safeParse returns a result instead of throwing
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.') || 'reply'}: ${i.message}`);
    return { ok: false, error: `LLM reply has the wrong shape (${problems.join('; ')})` };
  }

  return { ok: true, data: result.data };
}
