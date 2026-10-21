// LlmLog.js - one record for every call we make to Gemini (collection: "llmlogs").
// This powers the "LLM usage log" stretch goal: the shopkeeper can see how fast
// the LLM is, how many tokens it uses and how often parsing fails.

import mongoose from 'mongoose';

const llmLogSchema = new mongoose.Schema(
  {
    message: { type: String, required: true }, // the customer's text we sent to the LLM
    durationMs: { type: Number, required: true }, // how long the call took, in milliseconds
    inputTokens: { type: Number, default: 0 }, // tokens in our prompt (reported by Gemini)
    outputTokens: { type: Number, default: 0 }, // tokens in Gemini's reply
    success: { type: Boolean, required: true }, // did we get back valid, usable output?
    error: { type: String, default: '' }, // why it failed (timeout, bad JSON, etc.)
  },
  { timestamps: true } // createdAt = when the call happened
);

const LlmLog = mongoose.model('LlmLog', llmLogSchema);

export default LlmLog;
