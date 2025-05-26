// index.js (root-level)
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const dataPath = path.join(__dirname, 'data.json');
const templatePath = path.join(__dirname, 'data.template.json');

// Load or create initial data
function initializeData() {
  if (!fs.existsSync(dataPath)) {
    const template = fs.readFileSync(templatePath, 'utf-8');
    fs.writeFileSync(dataPath, template);
    console.log('Initialized data.json from template.');
  }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));

// Endpoint
app.post('/', (req, res) => {
  const command = req.body.command;
  res.json({ reply: `Command received: ${command}` });
});

// Start
initializeData();
app.listen(port, () => {
  console.log(`Brobot18 server running on port ${port}`);
});
