
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const dataPath = path.join(__dirname, 'data.json');
const templatePath = path.join(__dirname, 'data.template.json');
const logFile = path.join(__dirname, 'logs.json');

// Load or create initial data
function initializeData() {
  if (!fs.existsSync(dataPath)) {
    const template = fs.readFileSync(templatePath, 'utf-8');
    fs.writeFileSync(dataPath, template);
    console.log('Initialized data.json from template.');
  }
}

function ensureLogFile() {
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, JSON.stringify([]));
    console.log('Initialized logs.json');
  }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));

// Main Command POST Route
app.post('/', (req, res) => {
  const { command } = req.body;
  const reply = `Command received: ${command}`;
  res.json({ reply });

  // Log the command + reply
  const timestamp = new Date().toISOString();
  const entry = { timestamp, command, response: reply };

  let logs = [];
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
  }

  logs.unshift(entry);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
});

// Logs API
app.get('/logs', (req, res) => {
  if (!fs.existsSync(logFile)) return res.json([]);
  const logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
  res.json(logs);
});

initializeData();
ensureLogFile();
app.listen(port, () => {
  console.log(`Brobot18 server running on port ${port}`);
});
