// orders.test.js - stock reduction on confirm, concurrency, and the order status flow
// (stock reduction is one of the required test areas).

import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import Product from '../src/models/Product.js';
import Order from '../src/models/Order.js';
import catalog from '../src/seed/catalog.js';
import { shopkeeperAuth } from './helpers.js';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
});

// Every test starts with the original 20 products and no orders.
beforeEach(async () => {
  await Promise.all([Product.deleteMany({}), Order.deleteMany({})]);
  await Product.insertMany(catalog);
});

afterAll(async () => {
  await disconnectDB();
  await mongo.stop();
});

// Helpers
const product = (code) => Product.findOne({ code });
const idOf = async (code) => (await product(code))._id.toString();
const stockOf = async (code) => (await product(code)).stock;
const confirm = (body) => request(app).post('/api/orders').send(body);
const setStatus = (id, status) => request(app).patch(`/api/orders/${id}/status`).set(shopkeeperAuth()).send({ status });

describe('POST /api/orders (confirm)', () => {
  test('saves the order with prices from the database and reduces stock', async () => {
    const res = await confirm({
      customerName: 'Ravi',
      message: '2 kg atta aur ek dozen ande',
      items: [
        { productId: await idOf('P01'), quantity: 2, unitPrice: 1 }, // unitPrice is ignored: the DB price is used
        { productId: await idOf('P10'), quantity: 12 },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ customerName: 'Ravi', status: 'New', total: 180, originalMessage: '2 kg atta aur ek dozen ande' });
    expect(res.body.items[0]).toMatchObject({ code: 'P01', unitPrice: 48, quantity: 2, lineTotal: 96 });
    expect(await stockOf('P01')).toBe(48);
    expect(await stockOf('P10')).toBe(108);
  });

  test('more than the stock -> 409 with the amount available, and NO stock changes at all', async () => {
    const res = await confirm({
      customerName: 'Ravi',
      items: [
        { productId: await idOf('P01'), quantity: 2 }, // fine on its own...
        { productId: await idOf('P17'), quantity: 100 }, // ...but onion stock is only 60
      ],
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Only 60 kg of Onion left/);
    expect(res.body.details).toMatchObject({ available: 60 });
    expect(await stockOf('P01')).toBe(50); // the atta taken first was put back
    expect(await stockOf('P17')).toBe(60);
    expect(await Order.countDocuments()).toBe(0);
  });

  test('the same product twice is combined and checked together', async () => {
    const paneer = await idOf('P13'); // stock 8
    const res = await confirm({ customerName: 'Ravi', items: [{ productId: paneer, quantity: 5 }, { productId: paneer, quantity: 5 }] });
    expect(res.status).toBe(409);
    expect(await stockOf('P13')).toBe(8);
  });

  test('decimal kg amounts are stored cleanly (50 - 0.3 = 49.7)', async () => {
    await confirm({ customerName: 'Ravi', items: [{ productId: await idOf('P01'), quantity: 0.3 }] });
    expect(await stockOf('P01')).toBe(49.7);
  });

  test('rejects bad input with 400', async () => {
    const eggs = await idOf('P10');
    expect((await confirm({ customerName: 'Ravi', items: [{ productId: eggs, quantity: 1.5 }] })).status).toBe(400); // half an egg
    expect((await confirm({ customerName: 'Ravi', items: [{ productId: eggs, quantity: -1 }] })).status).toBe(400);
    expect((await confirm({ customerName: 'Ravi', items: [] })).status).toBe(400);
    expect((await confirm({ customerName: '', items: [{ productId: eggs, quantity: 1 }] })).status).toBe(400);
    expect((await confirm({ customerName: 'Ravi', items: [{ productId: 'nope', quantity: 1 }] })).status).toBe(400);
    expect((await confirm({ customerName: 'Ravi', items: [{ productId: '507f1f77bcf86cd799439011', quantity: 1 }] })).status).toBe(400);
    expect(await stockOf('P10')).toBe(120);
  });
});

describe('concurrency: stock never goes below zero', () => {
  test('20 customers each buying 1 of the last 8 paneer at the same moment -> exactly 8 succeed', async () => {
    const paneer = await idOf('P13');

    // Fire all 20 requests at once, without waiting for each other.
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => confirm({ customerName: `Customer ${i}`, items: [{ productId: paneer, quantity: 1 }] }))
    );

    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(8);
    expect(statuses.filter((s) => s === 409)).toHaveLength(12);
    expect(await stockOf('P13')).toBe(0);
    expect(await Order.countDocuments()).toBe(8);
  });

  test('two customers each wanting 5 of 8 paneer at the same moment -> only one succeeds', async () => {
    const paneer = await idOf('P13');
    const [a, b] = await Promise.all([
      confirm({ customerName: 'A', items: [{ productId: paneer, quantity: 5 }] }),
      confirm({ customerName: 'B', items: [{ productId: paneer, quantity: 5 }] }),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await stockOf('P13')).toBe(3);
  });
});

describe('GET /api/orders and /api/orders/mine', () => {
  test('lists newest first, and filters by customer (case-insensitive)', async () => {
    const atta = await idOf('P01');
    await confirm({ customerName: 'Ravi', items: [{ productId: atta, quantity: 1 }] });
    await confirm({ customerName: 'Sita', items: [{ productId: atta, quantity: 2 }] });

    const all = await request(app).get('/api/orders').set(shopkeeperAuth());
    expect(all.body.map((o) => o.customerName)).toEqual(['Sita', 'Ravi']);

    const ravi = await request(app).get('/api/orders/mine?customer=ravi');
    expect(ravi.body.map((o) => o.customerName)).toEqual(['Ravi']);
  });
});

describe('PATCH /api/orders/:id/status', () => {
  // Confirm a 2 kg atta order and return its id.
  const newOrder = async () =>
    (await confirm({ customerName: 'Ravi', items: [{ productId: await idOf('P01'), quantity: 2 }] })).body._id;

  test('New -> Packed -> Delivered', async () => {
    const id = await newOrder();
    expect((await setStatus(id, 'Packed')).body.status).toBe('Packed');
    expect((await setStatus(id, 'Delivered')).body.status).toBe('Delivered');
  });

  test('cannot skip steps, go backwards, or change a final order', async () => {
    const id = await newOrder();
    expect((await setStatus(id, 'Delivered')).status).toBe(409); // skip Packed
    await setStatus(id, 'Packed');
    expect((await setStatus(id, 'New')).status).toBe(409); // backwards
    await setStatus(id, 'Delivered');
    expect((await setStatus(id, 'Cancelled')).status).toBe(409); // already delivered
  });

  test('cancelling returns the items to stock', async () => {
    const id = await newOrder();
    expect(await stockOf('P01')).toBe(48);

    await setStatus(id, 'Cancelled');
    expect(await stockOf('P01')).toBe(50);
  });

  test('a double-click on Cancel restocks only once', async () => {
    const id = await newOrder();
    const [a, b] = await Promise.all([setStatus(id, 'Cancelled'), setStatus(id, 'Cancelled')]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await stockOf('P01')).toBe(50); // not 52
  });

  test('unknown status -> 400, unknown order -> 404', async () => {
    const id = await newOrder();
    expect((await setStatus(id, 'Shipped')).status).toBe(400);
    expect((await setStatus('507f1f77bcf86cd799439011', 'Packed')).status).toBe(404);
  });
});
