// llmLogs.test.js - the LLM usage summary shown to the shopkeeper.

import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import LlmLog from '../src/models/LlmLog.js';
import { shopkeeperAuth } from './helpers.js';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
});

beforeEach(async () => {
  await LlmLog.deleteMany({});
});

afterAll(async () => {
  await disconnectDB();
  await mongo.stop();
});

const getSummary = () => request(app).get('/api/llm-logs/summary').set(shopkeeperAuth());

test('with no calls yet, everything is zero', async () => {
  const res = await getSummary();
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ calls: 0, successRate: 0, avgDurationMs: 0, recent: [] });
});

test('adds up calls, success rate, average time and tokens', async () => {
  await LlmLog.create([
    { message: '2 kg atta', durationMs: 1000, inputTokens: 400, outputTokens: 50, success: true },
    { message: 'ek dozen ande', durationMs: 2000, inputTokens: 410, outputTokens: 60, success: true },
    { message: '1 kg sugar', durationMs: 10000, success: false, error: 'LLM did not answer within 10000 ms' },
  ]);

  const { body } = await getSummary();
  expect(body).toMatchObject({
    calls: 3,
    successes: 2,
    failures: 1,
    successRate: 67,
    avgDurationMs: 4333,
    inputTokens: 810,
    outputTokens: 110,
  });
  expect(body.recent).toHaveLength(3);
  expect(body.recent[0].message).toBe('1 kg sugar'); // newest first
});

test('only the latest 20 calls are listed', async () => {
  await LlmLog.create(Array.from({ length: 25 }, (_, i) => ({ message: `m${i}`, durationMs: 1, success: true })));
  const { body } = await getSummary();
  expect(body.calls).toBe(25);
  expect(body.recent).toHaveLength(20);
});

test('customers cannot see the log', async () => {
  expect((await request(app).get('/api/llm-logs/summary')).status).toBe(401);
});
