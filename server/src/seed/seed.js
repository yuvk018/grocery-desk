// seed.js - fills the database with the sample catalog.
// Run it with:  npm run seed   (from the server folder)
//
// It DELETES all existing products first, then inserts the 20 from catalog.js.
// So you can run it any time to reset the catalog (prices and stock) to a clean state for testing.
// Orders are left alone: each order item keeps its own copy of name and price.

require('dotenv').config(); // load MONGODB_URI from server/.env

const { connectDB, disconnectDB } = require('../config/db');
const Product = require('../models/Product');
const catalog = require('./catalog');

async function seed() {
  await connectDB(process.env.MONGODB_URI);

  const { deletedCount } = await Product.deleteMany({});
  console.log(`Removed ${deletedCount} old products`);

  const inserted = await Product.insertMany(catalog);
  console.log(`Inserted ${inserted.length} products`);
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1; // tell the terminal the script failed
  })
  .finally(disconnectDB); // always close the connection so the script can exit
