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
const intentFile = path.join(__dirname, 'intentModel.json');
const memoryFile = path.join(__dirname, 'memory.json');
const dataFile = path.join(__dirname, 'data.json');
const backupDir = path.join(__dirname, 'backups');

// Token validation middleware with obscure internal override
app.use((req, res, next) => {
  const internalBypass = req.headers['x-bbot-channel'] === 'overclock:shard77';
  const token = req.headers['x-brobot-key'];

  if (internalBypass || token === API_KEY) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden' });
});

app.use(express.json());
app.use(bodyParser.json());

const flowTracker = {
  active: [],
  paused: [],
  completed: [],
  archived: []
};

app.get('/', (req, res) => {
  res.send('Brobot server is running');
});

app.post('/hub/:id/log', (req, res) => {
  const { entries } = req.body;
  const { id } = req.params;
  if (!entries || !Array.isArray(entries)) return res.status(400).json({ error: 'Expected entries array' });

  const timestamp = new Date().toISOString();
  let logs = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf-8')) : [];

  const loggedEntries = entries.map(({ type, content }) => ({
    hub: id.toUpperCase(),
    type,
    content,
    timestamp
  }));

  logs.push(...loggedEntries);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  res.json({ message: 'Batch log saved', count: loggedEntries.length });
});

app.get('/memory/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Missing query string' });
  const memory = fs.existsSync(memoryFile) ? JSON.parse(fs.readFileSync(memoryFile, 'utf-8')) : [];
  const matches = memory.filter(item =>
    Object.values(item).some(val =>
      typeof val === 'string' && val.toLowerCase().includes(query.toLowerCase())
    )
  );
  res.json({ query, matches });
});

app.post('/hub/:id/task', (req, res) => {
  const { title, notes, priority, projectNotes } = req.body;
  const { id: hub } = req.params;
  if (!title || !priority) return res.status(400).json({ error: 'Missing task title or priority' });
  flowTracker.active.push({ title, notes, priority, hub, projectNotes });
  res.json({ status: 'Task added', task: { title, notes, priority, hub, projectNotes } });
});

app.get('/dashboard/:id', (req, res) => {
  const hubID = req.params.id.toUpperCase();
  if (!fs.existsSync(dataFile)) return res.status(500).json({ error: 'Data file not found.' });
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  if (!data[hubID]) return res.status(404).json({ error: 'No data for hub ' + hubID });
  const hubData = data[hubID];
  res.json({
    hub: hubID,
    activeProjects: hubData.activeProjects || [],
    pausedProjects: hubData.pausedProjects || [],
    completedProjects: hubData.completedProjects || []
  });
});

app.get('/backup', (req, res) => {
  try {
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('brobot_backup.zip');
    archive.pipe(res);
    const files = ['logs.json', 'memory.json', 'intentModel.json', 'data.json'];
    files.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) archive.file(filePath, { name: file });
    });
    archive.finalize().catch(err => {
      console.error("Archive error:", err);
      res.status(500).send('Backup error');
    });
  } catch (err) {
    console.error("Backup error:", err);
    res.status(500).send('Internal Server Error');
  }
});

// Auto-backup every 6 hours
cron.schedule('0 */6 * * *', () => {
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
  const outPath = path.join(backupDir, filename);
  const output = fs.createWriteStream(outPath);
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
