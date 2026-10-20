// app.js - builds and configures the Express app.
// It does NOT start listening on a port; server.js does that.
// Keeping them separate lets our tests import the app without starting a real server.

const express = require('express');
const cors = require('cors');

const app = express();

// --- Middleware (runs on every request, before our routes) ---
app.use(cors({ origin: process.env.CLIENT_URL || '*' })); // allow the React app to call us
app.use(express.json()); // turn JSON request bodies into req.body objects

// --- Health check: a simple route to confirm the API is alive ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes for products, orders, etc. are added in later steps.

module.exports = app;
