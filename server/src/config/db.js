// db.js - connects our app to MongoDB using Mongoose.
// Mongoose is a library that lets us define "schemas" (the shape of our data)
// and gives us easy functions like Product.find() instead of writing raw MongoDB queries.

const dns = require('dns');
const mongoose = require('mongoose');

// Atlas "mongodb+srv://" links need a special DNS lookup (an SRV record).
// On some Windows PCs and home routers Node cannot do that lookup and fails with
// "querySrv ECONNREFUSED". Setting DNS_SERVERS in .env (e.g. "8.8.8.8,1.1.1.1")
// tells Node to ask those public DNS servers instead. If it's not set, nothing changes.
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

// Connect to the database. We pass the URI in (instead of reading process.env here)
// so tests can connect to a temporary in-memory database instead of the real one.
async function connectDB(uri) {
  if (!uri) {
    // Fail early with a clear message instead of a confusing Mongoose error later.
    throw new Error('MONGODB_URI is missing. Copy server/.env.example to server/.env and fill it in.');
  }

  await mongoose.connect(uri);
  console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
}

// Close the connection (used by the seed script and tests so Node can exit cleanly).
async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
