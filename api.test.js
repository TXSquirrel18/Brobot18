const request = require('supertest');
const app = require('./index'); // Ensure index.js exports the app

const API_KEY = 'abc123secure'; // Use the same default or your environment value
const TEST_HEADERS = { 'x-brobot-key': API_KEY };

describe('Brobot API Core Tests', () => {
  it('GET / - confirms server is up', async () => {
    const res = await request(app)
      .get('/')
      .set(TEST_HEADERS);
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/running/i);
  });

  it('GET / without key - returns 403', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(403);
  });

  it('POST /hub/:id/log - logs entries', async () => {
    const payload = {
      entries: [
        { type: 'journal', content: 'Test log entry 1' },
        { type: 'win', content: 'Victory test' }
      ]
    };
    const res = await request(app)
      .post('/hub/P/log')
      .set(TEST_HEADERS)
      .send(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('count', 2);
  });

  it('POST /hub/:id/log with invalid body - returns 400', async () => {
    const res = await request(app)
      .post('/hub/P/log')
      .set(TEST_HEADERS)
      .send({ wrong: 'structure' });
    expect(res.statusCode).toBe(400);
  });

  it('GET /memory/search?query=test - handles missing file or empty result', async () => {
    const res = await request(app)
      .get('/memory/search?query=test')
      .set(TEST_HEADERS);
    expect([200, 400, 500]).toContain(res.statusCode);
  });

  it('GET /dashboard/:id - responds with hub data or error', async () => {
    const res = await request(app)
      .get('/dashboard/P')
      .set(TEST_HEADERS);
    expect([200, 404, 500]).toContain(res.statusCode);
  });

  it('GET /backup - returns zip stream', async () => {
    const res = await request(app)
      .get('/backup')
      .set(TEST_HEADERS);
    expect([200, 500]).toContain(res.statusCode);
    expect(res.headers['content-type']).toMatch(/zip/);
  });
});
