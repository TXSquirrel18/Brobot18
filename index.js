const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const sampleHubData = {
  C: { activeProjects: ['Story Draft'], pausedProjects: [], completedProjects: [] },
  H: { activeProjects: ['Groceries'], pausedProjects: [], completedProjects: [] },
  W: { activeProjects: ['Report'], pausedProjects: [], completedProjects: [] }
};

let flowCounts = {
  active: 4,
  paused: 3,
  completed: 9,
  archived: 2
};

app.get('/', (req, res) => {
  res.send('Brobot API is running!');
});

app.get('/hub/:id', (req, res) => {
  const data = sampleHubData[req.params.id] || {};
  res.json({ hub: req.params.id, ...data });
});

app.post('/hub/:id/log', (req, res) => {
  const { type, content } = req.body;
  if (!type || !content) return res.status(400).json({ error: 'Missing fields' });

  console.log(`[LOG][${req.params.id}] ${type}: ${content}`);
  res.json({ success: true, message: 'Log entry added' });
});

app.post('/hub/:id/task', (req, res) => {
  const { title, notes, priority, dueDate } = req.body;
  if (!title || !priority) return res.status(400).json({ error: 'Missing required fields' });

  console.log(`[TASK][${req.params.id}]`, { title, notes, priority, dueDate });
  res.json({ success: true, message: 'Task added', hub: req.params.id, data: req.body });
});

app.get('/flow-tracker', (req, res) => {
  res.json(flowCounts);
});

app.post('/flow-tracker/update', (req, res) => {
  const { project, newStatus } = req.body;
  if (!project || !newStatus) return res.status(400).json({ error: 'Missing fields' });

  flowCounts[newStatus] = (flowCounts[newStatus] || 0) + 1;
  console.log(`[FLOW][${project}] updated to ${newStatus}`);
  res.json({ success: true, message: 'Flow status updated' });
});

app.post('/intent-feedback', (req, res) => {
  const { command, tag, result, correction } = req.body;
  if (!command || !tag || !result) return res.status(400).json({ error: 'Missing fields' });

  console.log(`[LEARN]`, { command, tag, result, correction });
  res.json({ success: true, message: 'Feedback logged' });
});

app.listen(port, () => {
  console.log(`Brobot API live at http://localhost:${port}`);
});
