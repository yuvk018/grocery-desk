// server.js - the entry point. Loads environment variables, connects to MongoDB, then starts the HTTP server.

import 'dotenv/config'; // reads server/.env into process.env (must be the first import)

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

// Safety nets: errors that escaped every try/catch. Log them clearly instead of failing silently.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception, shutting down:', err);
  process.exit(1); // the app may be in a broken state; nodemon restarts it in development
});

// Connect to the database FIRST, then start listening.
// That way the API never accepts requests it can't answer.
connectDB(process.env.MONGODB_URI)
  .then(() => {
    const httpServer = app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });

    // e.g. another copy of the server is already running on this port
    httpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Is the server already running in another terminal?`);
      } else {
        console.error('HTTP server error:', err);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error(`Could not start server: ${err.message}`);
    process.exit(1); // stop the process: without a database the app is useless
  });
