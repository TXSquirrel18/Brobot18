const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// AUTH MIDDLEWARE
app.use((req, res, next) => {
  const override = req.header('x-ob-override');
  const brobotKey = req.header('x-brobot-key');
  if (req.path === '/ping') return next();
  if (override === 'shard77_internal' || brobotKey === 'abc123secure') return next();
  res.status(403).json({ error: 'Forbidden' });
});

// STATIC FILE SERVING
app.use('/ui', express.static(path.join(__dirname, 'ui')));

// ROUTES
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/hub/S/status', (req, res) => {
  res.json({ hub: 'Social', status: 'active', timestamp: new Date().toISOString() });
});

app.get('/hub/W/notes', (req, res) => {
  res.json({
    hub: 'Work Ops',
    notes: [
      "Complete client outreach batch",
      "Push Brobot V3 + C7 config",
      "Sync time blocks with legal calendar"
    ],
    updated: new Date().toISOString()
  });
});

app.get('/hub/:id', (req, res) => {
  const id = req.params.id;
  res.json({ hub: id, message: `Welcome to Hub ${id}` });
});

app.listen(PORT, () => {
  console.log(`Brobot server listening on port ${PORT}`);
});
