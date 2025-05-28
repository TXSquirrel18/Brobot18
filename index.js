const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.BROBOT_API_KEY || 'abc123secure';

const logFile = path.join(__dirname, 'logs.json');
const memoryFile = path.join(__dirname, 'memory.json');
const intentModel = path.join(__dirname, 'intentModel.json');
const dataFile = path.join(__dirname, 'data.json');
const flowFile = path.join(__dirname, 'flow.json');
const backupDir = path.join(__dirname, 'backups');

// Middleware for secure header validation with debug
app.use((req, res, next) => {
  console.log('HEADERS:', req.headers);
  const token = req.headers['x-brobot-key'];
  if (token === API_KEY) return next();
  return res.status(403).json({ error: 'Forbidden' });
});

app.use(express.json());

// Flow tracker structure
let flowTracker = {
  active: [],
  paused: [],
  completed: [],
  archived: []
};

// Root test endpoint
app.get('/', (req, res) => {
  res.send('Brobot server is running');
});

// POST /hub/:id/log — Save log entries
app.post('/hub/:id/log', (req, res) => {
  const { entries } = req.body;
  const hubId = req.params.id;
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'Expected entries array' });

  const timestamp = new Date().toISOString();
  let logs = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf-8')) : [];
  const loggedEntries = entries.map(e => ({ ...e, hub: hubId.toUpperCase(), time: timestamp }));
  logs.push(...loggedEntries);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  res.json({ message: 'Batch log saved', count: loggedEntries.length });
});

// GET /memory/search?query=term — Memory search
app.get('/memory/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Missing query string' });
  if (!fs.existsSync(memoryFile)) return res.status(404).json({ error: 'Memory not found' });

  const memory = JSON.parse(fs.readFileSync(memoryFile, 'utf-8'));
  const matches = memory.filter(item => Object.values(item).some(val => typeof val === 'string' && val.toLowerCase().includes(query.toLowerCase())));
  res.json(matches);
});

// POST /hub/:id/task — Add flow task
app.post('/hub/:id/task', (req, res) => {
  const { title, notes, priority, projectNotes } = req.body;
  const { id: hubID } = req.params;
  if (!title || !priority) return res.status(400).json({ error: 'Missing task title or priority' });

  flowTracker.active.push({ title, notes, priority, hub: hubID, projectNotes });
  res.json({ status: 'Task added', task: { title, notes, priority, hub: hubID, projectNotes } });
});

// GET /dashboard/:id — View current hub state
app.get('/dashboard/:id', (req, res) => {
  const hubID = req.params.id.toUpperCase();
  if (!fs.existsSync(flowFile)) return res.status(500).json({ error: 'Data file not found' });

  const data = JSON.parse(fs.readFileSync(flowFile, 'utf-8')) || {};
  const hubData = data[hubID] || { activeProjects: [], pausedProjects: [], completedProjects: [] };
  res.json({ hub: hubID, ...hubData });
});

// GET /backup — Return ZIP of data
app.get('/backup', (req, res) => {
  try {
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('brobot_backup.zip');

    archive.pipe(res);
    ['logs.json', 'memory.json', 'intentModel.json', 'data.json'].forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) archive.file(filePath, { name: file });
    });

    archive.finalize();
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Auto-backup every 6 hours
cron.schedule('0 */6 * * *', () => {
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const filename = `backup_${Date.now()}.zip`;
  const output = fs.createWriteStream(path.join(backupDir, filename));
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);
  ['logs.json', 'memory.json', 'intentModel.json', 'data.json'].forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) archive.file(filePath, { name: file });
  });

  archive.finalize();
  output.on('close', () => {
    console.log(`Auto-backup created: ${filename}`);
  });
});

app.listen(PORT, () => {
  console.log(`Brobot running on port ${PORT}`);
});

module.exports = app;
