// setupEnv.js - runs before every test file (see "setupFiles" in package.json).
// Gives the tests their own fake secrets, so they never need (or read) your real .env.

import path from 'path';

process.env.SHOPKEEPER_PASSWORD = 'test-password';
process.env.JWT_SECRET = 'test-secret';

// Always use the MongoDB copy in server/node_modules/.cache for the in-memory test database,
// whether tests are started from server/ or from the project root ("npm test" there).
// Without this, starting from the root makes mongodb-memory-server download MongoDB again.
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(process.cwd(), 'node_modules', '.cache', 'mongodb-memory-server');
