// app.js - builds and configures the Express app.
// It does NOT start listening on a port; server.js does that.
// Keeping them separate lets our tests import the app without starting a real server.

import express from 'express';
import cors from 'cors';

import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import llmLogRoutes from './routes/llmLogRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// --- Middleware (runs on every request, before our routes) ---
app.use(cors({ origin: process.env.CLIENT_URL || '*' })); // allow the React app to call us
app.use(express.json()); // turn JSON request bodies into req.body objects

// --- Health check: a simple route to confirm the API is alive ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// --- Our API routes ---
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/llm-logs', llmLogRoutes);

// --- Error handling (must come AFTER all routes) ---
app.use(notFound); // any URL that didn't match a route above -> 404
app.use(errorHandler); // any error thrown in a route/service ends up here

export default app;
