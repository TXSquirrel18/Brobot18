const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const sampleHubData = {
  C: { activeProjects: ['Stoneblood Rising'], pausedProjects: [], completedProjects: [] },
  H: { activeProjects: ['Grocery Lists'], pausedProjects: ['Car Maintenance'], completedProjects: [] },
  W: { activeProjects: ['DoorDash Reports'], pausedProjects: [], completedProjects: [] },
};

let flowCounts = {
  active: 6,
  paused: 4,
  completed: 3,
  archived: 2
};

app.get('/', (req, res) => {
  res.send('Brobot API is running');
});

app.get('/hub/:id', (req, res) => {
  const hub = req.params.id;
  const data = sampleHubData[hub] || { activeProjects: [], pausedProjects: [], completedProjects: [] };
  res.json({ hub, ...data });
});

app.post('/hub/:id/log', (req, res) => {
  const { type, content } = req.body;
  const hub = req.params.id;
  if (!type || !content) return res.status(400).json({ error: 'Missing type or content' });

  console.log(`[LOG][${hub}] ${type.toUpperCase()}: ${content}`);
  res.json({ status: 'Log entry added', hub, type });
});

app.get('/flow-tracker', (req, res) => {
  res.json(flowCounts);
});

app.post('/flow-tracker/update', (req, res) => {
  const { project, newStatus } = req.body;
  if (!project || !newStatus || !flowCounts[newStatus]) {
    return res.status(400).json({ error: 'Invalid project or status' });
  }

  console.log(`[FLOW UPDATE] ${project} → ${newStatus}`);
  flowCounts[newStatus]++;
  res.json({ status: 'Flow tracker updated', project, newStatus });
});

app.listen(port, () => {
  console.log(`Brobot API running on port ${port}`);
});
