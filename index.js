const express = require('express');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const bodyParser = require('body-parser');
const limiter = require('./rateLimiter');
const memoryHandler = require('./memoryHandler');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(limiter);

// File paths
const dataPath = path.join(__dirname, 'data.json');
const flowPath = path.join(__dirname, 'flow.json');
const memoryPath = path.join(__dirname, 'memory.json');
const logsPath = path.join(__dirname, 'logs.json');

// Utilities
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

// API routes
app.get('/', (req, res) => {
  res.send('🧠 Brobot18 backend running');
});

app.post('/memory', (req, res) => {
  const entry = req.body;
  memoryHandler(entry, memoryPath);
  res.status(200).json({ status: 'ok', entry });
});

app.post('/auth', auth);

// Fetch state
app.get('/data', (req, res) => {
  const data = readJson(dataPath);
  res.json(data);
});

app.get('/flow', (req, res) => {
  const flow = readJson(flowPath);
  res.json(flow);
});

app.get('/memory', (req, res) => {
  const memory = readJson(memoryPath);
  res.json(memory);
});

app.get('/logs', (req, res) => {
  const logs = readJson(logsPath);
  res.json(logs);
});

// Cron: autosave memory to logs every 10 mins
cron.schedule('*/10 * * * *', () => {
  const memory = readJson(memoryPath);
  const logs = readJson(logsPath);
  logs.push({ timestamp: new Date().toISOString(), memory });
  writeJson(logsPath, logs);
  console.log('🕒 Memory snapshot saved to logs.');
});

// Server start
app.listen(PORT, () => {
  console.log(`🚀 Brobot18 listening on port ${PORT}`);
});
