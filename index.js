const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const AUTH_KEY = 'abc123secure';
const INTERNAL_KEY = 'shard77_internal';

// Auth middleware
function checkAuth(req, res, next) {
  const internal = req.headers['x-ob-override'];
  const external = req.headers['x-brobot-key'];
  if (internal === INTERNAL_KEY || external === AUTH_KEY) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Static UI
app.use('/', express.static('ui'));

// Health check
app.get('/ping', (req, res) => {
  res.json({ status: 'alive', time: new Date().toISOString() });
});

// Dynamic Hub Response
app.get('/hub/:id', checkAuth, (req, res) => {
  const hubId = req.params.id.toUpperCase();
  res.json({ hub: hubId, status: 'connected' });
});

// Work Notes
app.get('/hub/W/notes', checkAuth, (req, res) => {
  const notes = JSON.parse(fs.readFileSync('data.json')).workNotes || [];
  res.json({ notes });
});

// Social Status
app.get('/hub/S/status', checkAuth, (req, res) => {
  const flow = JSON.parse(fs.readFileSync('flow.json'));
  res.json({
    hub: 'Social',
    active: flow.active.filter(p => p.includes('[S]')).length,
    paused: flow.paused.filter(p => p.includes('[S]')).length,
    completed: flow.completed.filter(p => p.inc
