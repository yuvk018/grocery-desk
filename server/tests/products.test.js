// products.test.js - tests the catalog API from the outside, the way the React app will call it.
//
// - mongodb-memory-server starts a throwaway MongoDB just for these tests,
//   so they never touch your real Atlas data.
// - supertest sends HTTP requests to our Express app without starting a real server.

import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import Product from '../src/models/Product.js';
import catalog from '../src/seed/catalog.js';
import { shopkeeperAuth } from './helpers.js';

let mongo;

// Before all tests: start the in-memory database and connect to it.
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
});

// Before each test: reset the catalog so every test starts from the same 20 products.
beforeEach(async () => {
  await Product.deleteMany({});
  await Product.insertMany(catalog);
});

// After all tests: disconnect and shut the database down.
afterAll(async () => {
  await disconnectDB();
  await mongo.stop();
});

// Helper: find the database ID of a product by its code.
const idOf = async (code) => (await Product.findOne({ code }))._id.toString();

describe('GET /api/products', () => {
  test('returns all 20 seeded products sorted by code', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(20);
    expect(res.body[0]).toMatchObject({ code: 'P01', name: 'Wheat Atta', unit: 'kg', price: 48, stock: 50 });
  });
});

describe('POST /api/products', () => {
  test('creates a product and gives it the next code', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(shopkeeperAuth())
      .send({ name: 'Ghee (500 ml)', unit: 'packet', price: '320', stock: 10, aliases: ['GHEE'] });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ code: 'P21', name: 'Ghee (500 ml)', price: 320, aliases: ['ghee'] });
  });

  test('rejects a bad unit and a negative price with 400', async () => {
    const res = await request(app).post('/api/products').set(shopkeeperAuth()).send({ name: 'Ghee', unit: 'bottle', price: -5, stock: 1 });

    expect(res.status).toBe(400);
    const fields = res.body.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['unit', 'price']));
  });

  test('rejects a duplicate code with 409', async () => {
    const res = await request(app).post('/api/products').set(shopkeeperAuth()).send({ code: 'P01', name: 'Copy', unit: 'kg', price: 1, stock: 1 });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/products/:id', () => {
  test('updates only the fields sent', async () => {
    const res = await request(app).put(`/api/products/${await idOf('P06')}`).set(shopkeeperAuth()).send({ price: 50 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: 'P06', name: 'Sugar', price: 50, stock: 40 });
  });

  test('rejects negative stock', async () => {
    const res = await request(app).put(`/api/products/${await idOf('P06')}`).set(shopkeeperAuth()).send({ stock: -1 });
    expect(res.status).toBe(400);
  });

  test('returns 404 for an unknown or malformed id', async () => {
    expect((await request(app).put('/api/products/507f1f77bcf86cd799439011').set(shopkeeperAuth()).send({ price: 1 })).status).toBe(404);
    expect((await request(app).put('/api/products/not-an-id').set(shopkeeperAuth()).send({ price: 1 })).status).toBe(404);
  });
});

describe('DELETE /api/products/:id', () => {
  test('removes the product', async () => {
    const res = await request(app).delete(`/api/products/${await idOf('P20')}`).set(shopkeeperAuth());

    expect(res.status).toBe(204);
    expect(await Product.countDocuments()).toBe(19);
  });
});

describe('unknown routes', () => {
  test('return 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Route not found/);
  });
});
