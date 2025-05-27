const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const logFile = path.join(__dirname, 'logs.json');
const memoryFile = path.join(__dirname, 'memory.json');
const intentFile = path.join(__dirname, 'intentModel.json');

app.use(cors());
app.use(bodyParser.json());

const flowTracker = {
  active: [],
  paused: [],
  completed: [],
  archived: []
};

function getLatestTaskTitle() {
  return flowTracker.active.length > 0 ? flowTracker.active[0].title : null;
}

// -- Routes --

app.get('/', (req, res) => {
  res.send('Brobot server is running');
});

app.post('/command', (req, res) => {
  const { command } = req.body;
  console.log("Command received:", command);
  res.json({ reply: "Command processed: " + command });
});

app.post('/task', (req, res) => {
  const { title, notes, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title required' });
  flowTracker.active.push({ title, notes, priority });
  res.json({ status: 'Task added to active', task: { title, notes, priority } });
});

app.post('/move', (req, res) => {
  const { title, newStatus } = req.body;
  let found = false;
  for (const [status, list] of Object.entries(flowTracker)) {
    const idx = list.findIndex(task => task.title === title);
    if (idx !== -1) {
      const [task] = list.splice(idx, 1);
      flowTracker[newStatus].push(task);
      found = true;
      return res.json({ status: `Task moved to ${newStatus}`, task });
    }
  }
  if (!found) return res.status(404).json({ error: 'Task not found' });
});

app.post('/hub/:id/log', (req, res) => {
  const { id } = req.params;
  const { type, content, version, context } = req.body;
  if (!type || !content) return res.status(400).json({ error: 'Missing type or content in log.' });

  const timestamp = new Date().toISOString();
  const linkedTask = getLatestTaskTitle();
  const entry = {
    hub: id.toUpperCase(), type, content, timestamp,
    ...(version ? { version } : {}),
    ...(context ? { context } : {}),
    ...(linkedTask ? { linkedTask } : {})
  };

  let logs = [];
  if (fs.existsSync(logFile)) logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
  logs.unshift(entry);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));

  res.json({ message: `Log saved to hub [${id.toUpperCase()}]`, entry });
});

app.get('/flow-tracker', (req, res) => {
  res.json({
    active: flowTracker.active.map(t => t.title),
    paused: flowTracker.paused.map(t => t.title),
    completed: flowTracker.completed.map(t => t.title),
    archived: flowTracker.archived.map(t => t.title)
  });
});

app.post('/memory', (req, res) => {
  const memoryItem = req.body;
  if (!memoryItem || !memoryItem.content)
    return res.status(400).json({ error: 'Missing content in memory item.' });

  const timestamp = new Date().toISOString();
  memoryItem.timestamp = timestamp;

  let memory = [];
  if (fs.existsSync(memoryFile)) memory = JSON.parse(fs.readFileSync(memoryFile, 'utf-8'));
  memory.unshift(memoryItem);
  fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));

  res.json({ message: 'Memory saved.', entry: memoryItem });
});

app.get('/memory', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!fs.existsSync(memoryFile)) return res.json([]);

  const memory = JSON.parse(fs.readFileSync(memoryFile, 'utf-8'));
  if (!q) return res.json(memory);

  const filtered = memory.filter(entry =>
    Object.values(entry).some(val =>
      typeof val === 'string' && val.toLowerCase().includes(q)
    )
  );
  res.json(filtered);
});

// -- Intent Trainer --

app.post('/train-intent', (req, res) => {
  const { phrase, intent } = req.body;
  if (!phrase || !intent) return res.status(400).json({ error: 'Missing phrase or intent' });

  let model = [];
  if (fs.existsSync(intentFile)) model = JSON.parse(fs.readFileSync(intentFile, 'utf-8'));
  model.unshift({ phrase: phrase.toLowerCase(), intent });
  fs.writeFileSync(intentFile, JSON.stringify(model, null, 2));

  res.json({ message: 'Intent trained.', entry: { phrase, intent } });
});

app.post('/smart', (req, res) => {
  const { command } = req.body;
  const phrase = command.toLowerCase();
  let model = [];
  if (fs.existsSync(intentFile)) model = JSON.parse(fs.readFileSync(intentFile, 'utf-8'));

  const match = model.find(p => phrase.includes(p.phrase));
  const intent = match ? match.intent : "unknown";
  res.json({ intent, route: intent === "unknown" ? null : `/${intent}` });
});

// -- Summaries & Indexes --

app.get('/summary/:id', (req, res) => {
  const { id } = req.params;
  const hubID = id.toUpperCase();

  let logs = [];
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'))
      .filter(log => log.hub === hubID)
      .slice(0, 5);
  }

  const tasks = {
    active: flowTracker.active.filter(t => t.hub === hubID),
    paused: flowTracker.paused.filter(t => t.hub === hubID),
    completed: flowTracker.completed.filter(t => t.hub === hubID)
  };

  const lastUpdate = logs.length > 0 ? logs[0].timestamp : null;

  res.json({
    hub: hubID,
    recentLogs: logs,
    openTasks: tasks.active.map(t => t.title),
    lastUpdate
  });
});

app.get('/log-index', (req, res) => {
  if (!fs.existsSync(logFile)) return res.json([]);
  const logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
  const index = {};

  logs.forEach(log => {
    const version = log.version || "Unversioned";
    const context = log.context || "General";
    if (!index[version]) index[version] = {};
    if (!index[version][context]) index[version][context] = [];
    index[version][context].push({
      hub: log.hub, type: log.type, content: log.content,
      timestamp: log.timestamp,
      ...(log.linkedTask ? { linkedTask: log.linkedTask } : {})
    });
  });

  res.json(index);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get('/dashboard/:id', (req, res) => {
  const { id } = req.params;
  const hubID = id.toUpperCase();

  let logs = [];
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'))
      .filter(log => log.hub === hubID)
      .slice(0, 10);
  }

  const taskSummary = {
    active: flowTracker.active.filter(t => t.hub === hubID).length,
    paused: flowTracker.paused.filter(t => t.hub === hubID).length,
    completed: flowTracker.completed.filter(t => t.hub === hubID).length
  };

  const flowCounts = {
    active: flowTracker.active.length,
    paused: flowTracker.paused.length,
    completed: flowTracker.completed.length,
    archived: flowTracker.archived.length
  };

  const lastUpdate = logs.length > 0 ? logs[0].timestamp : null;

  res.json({
    hub: hubID,
    logs,
    taskSummary,
    flowCounts,
    lastUpdate
  });
});

app.get('/analytics', (req, res) => {
  if (!fs.existsSync(logFile)) return res.json({ error: "No log data found." });

  const logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
  const frequencyByHub = {};
  const frequencyByType = {};
  const timeline = [];

  logs.forEach(log => {
    frequencyByHub[log.hub] = (frequencyByHub[log.hub] || 0) + 1;
    frequencyByType[log.type] = (frequencyByType[log.type] || 0) + 1;
    timeline.push(log.timestamp);
  });

  const streakStart = logs.length ? logs[logs.length - 1].timestamp : null;
  const lastLogged = logs.length ? logs[0].timestamp : null;

  res.json({
    totalLogs: logs.length,
    byHub: frequencyByHub,
    byType: frequencyByType,
    streakStart,
    lastLogged
  });
});

const archiver = require('archiver');

app.get('/backup', (req, res) => {
  const archive = archiver('zip', { zlib: { level: 9 } });
  res.attachment('brobot_backup.zip');
  archive.pipe(res);

  const files = ['logs.json', 'memory.json', 'intentModel.json'];
  files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) archive.file(filePath, { name: file });
  });

  archive.finalize();
});
