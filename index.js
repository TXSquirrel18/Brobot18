const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

const logFile = path.join(__dirname, 'logs.json');
const memoryFile = path.join(__dirname, 'memory.json');
const intentFile = path.join(__dirname, 'intentModel.json');
const dataFile = path.join(__dirname, 'data.json');

app.use(express.json());
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

app.get('/', (req, res) => {
  res.send('Brobot server is running');
});

app.post('/command', (req, res) => {
  const { command } = req.body;
  console.log('Command received:', command);
  res.json({ reply: 'Command processed: ' + command });
});

app.post('/hub/:id/task', (req, res) => {
  const { title, notes, priority } = req.body;
  const { id: hub } = req.params;
  if (!title || !priority) return res.status(400).json({ error: 'Missing task title or priority' });
  flowTracker.active.push({ title, notes, priority, hub });
  res.json({ status: 'Task added to active', task: { title, notes, priority, hub } });
});

app.post('/hub/:id/task/move', (req, res) => {
  const { title, newStatus } = req.body;
  for (const list of [flowTracker.active, flowTracker.paused, flowTracker.completed]) {
    const index = list.findIndex(task => task.title === title);
    if (index > -1) {
      const [task] = list.splice(index, 1);
      flowTracker[newStatus].push(task);
      return res.json({ status: 'Task moved to ' + newStatus, task });
    }
  }
  res.status(404).json({ error: 'Task not found' });
});

app.post('/hub/:id/log', (req, res) => {
  const { type, content } = req.body;
  const { id } = req.params;
  if (!type || !content) return res.status(400).json({ error: 'Missing type or content' });

  const timestamp = new Date().toISOString();
  const entry = { hub: id.toUpperCase(), type, content, timestamp };

  let logs = [];
  if (fs.existsSync(logFile)) logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
  logs.push(entry);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  res.json({ message: 'Log saved to hub', entry });
});

app.get('/flow-tracker', (req, res) => {
  const counts = {
    active: flowTracker.active.length,
    paused: flowTracker.paused.length,
    completed: flowTracker.completed.length,
    archived: flowTracker.archived.length
  };
  res.json(counts);
});

app.post('/flow-tracker/update', (req, res) => {
  const { project, newStatus } = req.body;
  for (const list of [flowTracker.active, flowTracker.paused, flowTracker.completed]) {
    const index = list.findIndex(task => task.title === project);
    if (index > -1) {
      const [task] = list.splice(index, 1);
      flowTracker[newStatus].push(task);
      return res.json({ status: 'Task moved to ' + newStatus, task });
    }
  }
  res.status(404).json({ error: 'Project not found' });
});

app.post('/train-intent', (req, res) => {
  const { phrase, intent } = req.body;
  if (!phrase || !intent) return res.status(400).json({ error: 'Missing phrase or intent' });

  let model = {};
  if (fs.existsSync(intentFile)) model = JSON.parse(fs.readFileSync(intentFile, 'utf-8'));
  model[phrase.toLowerCase()] = intent;

  fs.writeFileSync(intentFile, JSON.stringify(model, null, 2));
  res.json({ message: 'Intent trained', entry: { phrase, intent } });
});

app.post('/intent-feedback', (req, res) => {
  const { command, tag, result, correction } = req.body;
  if (!command || !tag || !result) return res.status(400).json({ error: 'Missing fields' });

  const feedback = { command, tag, result, correction, timestamp: new Date().toISOString() };
  const memory = fs.existsSync(memoryFile) ? JSON.parse(fs.readFileSync(memoryFile, 'utf-8')) : [];
  memory.push(feedback);
  fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
  res.json({ message: 'Feedback logged', feedback });
});

app.get('/dashboard/:id', (req, res) => {
  const hubID = req.params.id.toUpperCase();
  if (!fs.existsSync(dataFile)) return res.status(500).json({ error: 'Data file not found.' });

  const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  if (!data[hubID]) return res.status(404).json({ error: 'No data found for hub ' + hubID });

  const hubData = data[hubID];
  res.json({
    hub: hubID,
    activeProjects: hubData.activeProjects || [],
    pausedProjects: hubData.pausedProjects || [],
    completedProjects: hubData.completedProjects || []
  });
});

app.get('/analytics', (req, res) => {
  if (!fs.existsSync(logFile)) return res.status(404).json({ error: 'No log data found.' });
  const logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
  const frequencyByType = {};
  const frequencyByHub = {};
  logs.forEach(log => {
    frequencyByType[log.type] = (frequencyByType[log.type] || 0) + 1;
    frequencyByHub[log.hub] = (frequencyByHub[log.hub] || 0) + 1;
  });
  res.json({ frequencyByHub, frequencyByType });
});

app.get('/backup', (req, res) => {
  try {
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('brobot_backup.zip');
    archive.pipe(res);

    const files = ['logs.json', 'memory.json', 'intentModel.json'];
    files.forEach(file => archive.file(path.join(__dirname, file), { name: file }));

    archive.finalize().catch(err => {
      console.error('Archive error:', err);
      res.status(500).send('Backup error');
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
