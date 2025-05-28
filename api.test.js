const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Ensure this line matches how your index.js exports the app
const app = require('../index');

const INTERNAL_HEADER = { 'x-ob-override': 'shard77_internal' };
const API_HEADER = { 'x-brobot-key': 'abc123secure' };

// Basic GET test
describe('GET /', () => {
  it('should confirm the server is running', async () => {
    const res = await request(app).get('/').set(INTERNAL_HEADER);
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/brobot server is running/i);
  });
});

// Logging endpoint test
describe('POST /hub/:id/log', () => {
  it('should log batch entries', async () => {
    const res = await request(app)
      .post('/hub/C/log')
      .set(INTERNAL_HEADER)
      .send({
        entries: [
          { type: 'journal', content: 'Test log entry' },
          { type: 'update', content: 'Second entry' }
        ]
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Batch log saved');
    expect(res.body.count).toBe(2);
  });
});

// Task addition test
describe('POST /hub/:id/task', () => {
  it('should add a new task to flow tracker', async () => {
    const res = await request(app)
      .post('/hub/P/task')
      .set(INTERNAL_HEADER)
      .send({
        title: 'Test Task',
        notes: 'Do something important',
        priority: 'high',
        projectNotes: 'Initial test'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('Task added');
  });
});

// Memory search test (if memory file exists)
describe('GET /memory/search', () => {
  beforeAll(() => {
    const memoryFile = path.join(__dirname, '../memory.json');
    fs.writeFileSync(memoryFile, JSON.stringify([{ note: 'remember to test' }], null, 2));
  });

  it('should return matching memory items', async () => {
    const res = await request(app)
      .get('/memory/search?query=test')
      .set(INTERNAL_HEADER);
    expect(res.statusCode).toBe(200);
    expect(res.body.matches.length).toBeGreaterThan(0);
  });
});

// Backup endpoint
describe('GET /backup', () => {
  it('should return a zip file', async () => {
    const res = await request(app)
      .get('/backup')
      .set(INTERNAL_HEADER);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename=brobot_backup.zip/);
  });
});
