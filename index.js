// index.js

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const hubNames = {
  C: 'Creative',
  H: 'Home Base & Operations',
  L: 'Legal',
  P: 'Personal Wellness',
  S: 'Social',
  T: 'Temporal Ops',
  W: 'Work & Professional'
};

const hubs = {
  C: { activeProjects: [], pausedProjects: [], completedProjects: [], logs: [] },
  H: { activeProjects: [], pausedProjects: [], completedProjects: [], logs: [] },
  L: { activeProjects: [], pausedProjects: [], completedProjects: [], logs: [] },
  P: { activeProjects: [], pausedProjects: [], completedProjects: [], logs: [] },
  S: { activeProjects: [], pausedProjects: [], completedProjects: [], logs: [] },
  T: { activeProjects: [], pausedProjects: [], completedProjects: [], logs: [] },
  W: { activeProjects: [], pausedProjects: [], completedProjects: [], logs: [] }
};

// GET hub status
app.get('/hub/:id', (req, res) => {
  const id = req.params.id.toUpperCase();
  if (!hubs[id]) return res.status(404).send('Hub not found');

  res.json({
    hub: hubNames[id],
    activeProjects: hubs[id].activeProjects,
    pausedProjects: hubs[id].pausedProjects,
    completedProjects: hubs[id].completedProjects
  });
});

// POST log entry
app.post('/hub/:id/log', (req, res) => {
  const id = req.params.id.toUpperCase();
  const { type, content } = req.body;

  if (!hubs[id]) return res.status(404).send('Hub not found');
  if (!['journal', 'win', 'update'].includes(type)) return res.status(400).send('Invalid log type');

  const entry = {
    timestamp: new Date().toISOString(),
    type,
    content
  };

  hubs[id].logs.push(entry);
  res.json({ message: 'Entry logged', entry });
});

// Optional: retrieve all logs for a hub
app.get('/hub/:id/logs', (req, res) => {
  const id = req.params.id.toUpperCase();
  if (!hubs[id]) return res.status(404).send('Hub not found');
  res.json(hubs[id].logs);
});

app.listen(PORT, () => {
  console.log(`Brobot backend running on port ${PORT}`);
});
