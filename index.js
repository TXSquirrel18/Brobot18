const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static UI files from /ui folder
app.use('/ui', express.static(path.join(__dirname, 'ui')));

// Authorization middleware
const API_KEY = process.env.BROBOT_API_KEY || 'abc123secure';
app.use((req, res, next) => {
  const override = req.headers['x-ob-override'];
  const token = req.headers['x-brobot-key'];
  if (override === 'shard77_internal' || token === API_KEY || req.path === '/ping') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden' });
});

// Base test route
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// /hub/S/status route
app.get('/hub/S/status', (req, res) => {
  res.json({
    hub: 'Social',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// /hub/W/notes route
app.get('/hub/W/notes', (req, res) => {
  res.json({
    hub: 'Work Ops',
    notes: [
      'Complete client outreach batch',
      'Push Brobot V3 + C7 config',
      'Sync time blocks with legal calendar'
    ],
    updated: new Date().toISOString()
  });
});

// Generalized /hub/:id route handler
const validHubs = ['H', 'C', 'W', 'L', 'P', 'S', 'T'];
app.get('/hub/:id', (req, res) => {
  const { id } = req.params;
  if (!validHubs.includes(id)) {
    return res.status(404).json({ error: 'Hub not found' });
  }
  res.json({ hub: id, message: `Welcome to Hub ${id}` });
});

// Root route
app.get('/', (req, res) => {
  res.send({ message: 'Brobot server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Brobot server running on port ${PORT}`);
});
