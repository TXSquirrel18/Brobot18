require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_KEY;

const AUTH_KEY = 'abc123secure';
const INTERNAL_KEY = 'shard77_internal';

app.use(cors({
  origin: ['https://brobot18.onrender.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-ob-override', 'x-brobot-key']
}));

app.use(express.json());

function checkAuth(req, res, next) {
  const internal = req.headers['x-ob-override'];
  const external = req.headers['x-brobot-key'];
  if (internal === INTERNAL_KEY || external === AUTH_KEY) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

const gptLimiter = rateLimit({
  windowMs: 60000,
  max: 5,
  message: { error: "Too many GPT requests. Slow down." }
});

let gptEnabled = true;

app.post('/disable-gpt', checkAuth, (req, res) => {
  gptEnabled = false;
  res.json({ status: "GPT temporarily disabled" });
});

app.post('/brobot-gpt', checkAuth, gptLimiter, async (req, res) => {
  try {
    if (!gptEnabled) return res.status(503).json({ error: "GPT is currently disabled" });

    const { query } = req.body;
    if (!query || query.length > 500 || /<script/i.test(query)) {
      return res.status(400).json({ error: "Invalid query" });
    }

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

app.use('/', express.static('ui', { index: false }));

app.use((req, res) => {
  fs.appendFileSync("logs.json", JSON.stringify({ time: new Date(), path: req.path }) + "\n");
  res.status(404).json({ error: "Not Found" });
});

app.listen(PORT, () => console.log(`Brobot running on port ${PORT}`));
