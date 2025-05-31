require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_KEY;

app.use(cors());
app.use(express.json());

const AUTH_KEY = 'abc123secure';
const INTERNAL_KEY = 'shard77_internal';

function checkAuth(req, res, next) {
  const internal = req.headers['x-ob-override'];
  const external = req.headers['x-brobot-key'];
  if (internal === INTERNAL_KEY || external === AUTH_KEY) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use('/', express.static('ui'));

app.get('/ping', (req, res) => {
  res.json({ status: 'alive', time: new Date().toISOString() });
});

app.get('/hub/:id', checkAuth, (req, res) => {
  const hubId = req.params.id.toUpperCase();
  res.json({ hub: hubId, status: 'connected' });
});

app.get('/hub/W/notes', checkAuth, (req, res) => {
  const notes = JSON.parse(fs.readFileSync('data.json')).workNotes || [];
  res.json({ notes });
});

app.get('/hub/S/status', checkAuth, (req, res) => {
  const flow = JSON.parse(fs.readFileSync('flow.json'));
  res.json({
    hub: 'Social',
    active: flow.active.filter(p => p.includes('[S]')).length,
    paused: flow.paused.filter(p => p.includes('[S]')).length,
    completed: flow.completed.filter(p => p.includes('[S]')).length
  });
});

// GPT Proxy Endpoint
app.post('/brobot-gpt', checkAuth, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Missing query" });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are Brobot, Presto's life-deck assistant. Reply in clean, direct tone per Brobot 5.0 JSON. Respect tone rules, strip fluff, and follow contextual mission rules." },
          { role: "user", content: query }
        ]
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "GPT Proxy Error", detail: err.toString() });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.listen(PORT, () => console.log(`Brobot running on port ${PORT}`));
