// server.js - the entry point. Loads environment variables, connects to MongoDB, then starts the HTTP server.

require('dotenv').config(); // reads server/.env into process.env

const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to the database FIRST, then start listening.
// That way the API never accepts requests it can't answer.
connectDB(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Could not start server:', err.message);
    process.exit(1); // stop the process: without a database the app is useless
  });
