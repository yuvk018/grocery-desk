// server.js - the entry point. Loads environment variables and starts the HTTP server.

require('dotenv').config(); // reads server/.env into process.env

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
