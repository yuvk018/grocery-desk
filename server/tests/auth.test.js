// auth.test.js - shopkeeper login and which routes are protected.

import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import Product from '../src/models/Product.js';
import catalog from '../src/seed/catalog.js';
import { shopkeeperAuth } from './helpers.js';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  await Product.insertMany(catalog);
});

afterAll(async () => {
  await disconnectDB();
  await mongo.stop();
});

const fakeId = '507f1f77bcf86cd799439011';

describe('POST /api/auth/login', () => {
  test('right password -> a token', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'test-password' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('shopkeeper');
    expect(jwt.verify(res.body.token, 'test-secret')).toMatchObject({ role: 'shopkeeper' });
  });

  test('wrong password -> 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'guess' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test('no password -> 400', async () => {
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(400);
  });
});

describe('shopkeeper-only routes', () => {
  // Every route that must be blocked without a login.
  const protectedRoutes = [
    ['post', '/api/products'],
    ['put', `/api/products/${fakeId}`],
    ['delete', `/api/products/${fakeId}`],
    ['get', '/api/orders'],
    ['patch', `/api/orders/${fakeId}/status`],
  ];

  test.each(protectedRoutes)('%s %s without a token -> 401', async (method, url) => {
    const res = await request(app)[method](url).send({});
    expect(res.status).toBe(401);
  });

  test('a forged token (signed with the wrong secret) -> 401', async () => {
    const forged = jwt.sign({ role: 'shopkeeper' }, 'not-the-real-secret');
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  test('an expired token -> 401 with a clear message', async () => {
    const expired = jwt.sign({ role: 'shopkeeper' }, 'test-secret', { expiresIn: -10 });
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/);
  });

  test('a valid token gets through', async () => {
    const res = await request(app).get('/api/orders').set(shopkeeperAuth());
    expect(res.status).toBe(200);
  });

  test('a customer cannot change a price', async () => {
    const id = (await Product.findOne({ code: 'P02' }))._id;
    const res = await request(app).put(`/api/products/${id}`).send({ price: 1 });
    expect(res.status).toBe(401);
    expect((await Product.findById(id)).price).toBe(120);
  });
});

describe('customer routes stay open (no login needed)', () => {
  test('list products', async () => {
    expect((await request(app).get('/api/products')).status).toBe(200);
  });

  test('my orders needs a name, but no login', async () => {
    expect((await request(app).get('/api/orders/mine?customer=Ravi')).status).toBe(200);
    expect((await request(app).get('/api/orders/mine')).status).toBe(400);
  });
});
