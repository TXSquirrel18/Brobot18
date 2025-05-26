const express = require('express');
const fs = require('fs-extra');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const DATA_FILE = './data.json';
const TEMPLATE_FILE = './data.template.json';

const hubNames = {
  C: 'Creative',
  H: 'Home Base & Operations',
  L: 'Legal',
  P: 'Personal Wellness',
  S: 'Social',
  T: 'Temporal Ops',
  W: 'Work & Professional'
};

const loadData = async () => {
  try {
    return await fs.readJson(DATA_FILE);
  } catch {
    return {};
  }
};

const saveData = async (data) => {
  await fs.writeJson(DATA_FILE, data, { spaces: 2 });
};

const ensureDataFileExists = async () => {
  const exists = await fs.pathExists(DATA_FILE);
  if (!exists) {
    const template = await fs.readJson(TEMPLATE_FILE);
    await saveData(template);
    console.log('Created data.json from template');
  }
};

app.use(async (req, res, next) => {
  await ensureDataFileExists();
  next();
});

// GET hub status
app.get('/hub/:id', async (req, res) => {
  const id = req.params.id.toUpperCase();
  const data = await loadData();
  if (!data[id]) return res.status(404).send('Hub not found');

  res.json({
    hub: hubNames[id],
    activeProjects: data[id].activeProjects,
    pausedProjects: data[id].pausedProjects,
    completedProjects: data[id].completedProjects
  });
});

// POST log entry
app.post('/hub/:id/log', async (req, res) => {
  const id = req.params.id.toUpperCase();
  const { type, content } = req.body;
  const data = await loadData();

  if (!data[id]) return res.status(404).send('Hub not found');
  if (!['journal', 'win', 'update'].includes(type)) return res.status(400).send('Invalid log type');

  const entry = {
    timestamp: new Date().toISOString(),
    type,
    content
  };

  data[id].logs.push(entry);
  await saveData(data);

  res.json({ message: 'Entry logged', entry });
});

// GET all logs for a hub
app.get('/hub/:id/logs', async (req, res) => {
  const id = req.params.id.toUpperCase();
  const data = await loadData();
  if (!data[id]) return res.status(404).send('Hub not found');

  res.json(data[id].logs);
});

// POST new task/project
app.post('/hub/:id/task', async (req, res) => {
  const id = req.params.id.toUpperCase();
  const { title, notes = '', priority = 'medium', dueDate = null } = req.body;
  const data = await loadData();

  if (!data[id]) return res.status(404).send('Hub not found');

  const newTask = {
    title,
    notes,
    priority,
    dueDate,
    createdAt: new Date().toISOString()
  };

  data[id].activeProjects.push(newTask);
  await saveData(data);

  res.json({ message: 'Task added to active projects', task: newTask });
});

// PUT to move task
app.put('/hub/:id/task/move', async (req, res) => {
  const id = req.params.id.toUpperCase();
  const { title, newStatus } = req.body;
  const data = await loadData();

  if (!data[id]) return res.status(404).send('Hub not found');
  if (!['activeProjects', 'pausedProjects', 'completedProjects'].includes(newStatus)) {
    return res.status(400).send('Invalid status');
  }

  const allStatuses = ['activeProjects', 'pausedProjects', 'completedProjects'];
  let movedTask = null;

  for (const status of allStatuses) {
    const idx = data[id][status].findIndex(t => t.title === title);
    if (idx !== -1) {
      movedTask = data[id][status].splice(idx, 1)[0];
      break;
    }
  }

  if (!movedTask) return res.status(404).send('Task not found');
  data[id][newStatus].push(movedTask);
  await saveData(data);

  res.json({ message: `Task moved to ${newStatus}`, task: movedTask });
});

app.listen(PORT, () => {
  console.log(`Brobot backend running on port ${PORT}`);
});
