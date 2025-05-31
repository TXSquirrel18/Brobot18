const request = require('supertest');
const app = require('./index'); // Make sure your index.js exports app

const API_KEY = 'abc123secure';
const TEST_HEADERS = { 'x-brobot-key': API_KEY };

describe('Brobot API Core Tests', () => {
  it('GET / - confirms server is up', async () => {
    const res = await request(app)
      .get('/')
      .set(TEST_HEADERS);
    expect(res.statusCode).toBe(200);
  });

  it('GET / without key - returns 403', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(403);
  });

  it('POST /hub/:id/log - logs entries', async () => {
    const res = await request(app)
      .post('/hub/P/log')
      .set(TEST_HEADERS)
      .send({ entries: [{ type: 'journal', content: 'Log test' }] });
    expect(res.statusCode).toBe(200);
  });
});
