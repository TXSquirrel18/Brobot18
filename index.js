const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const flowTracker = {
  active: [],
  paused: [],
  completed: [],
  archived: []
};

app.get('/', (req, res) => {
  res.send('Brobot server is running');
});

app.post('/command', (req, res) => {
  const { command } = req.body;
  console.log("Command received:", command);
  res.json({ reply: "Command processed: " + command });
});

app.post('/task', (req, res) => {
  const { title, notes, priority } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title required' });
  }
  flowTracker.active.push({ title, notes, priority });
  res.json({ status: 'Task added to active', task: { title, notes, priority } });
});

app.post('/move', (req, res) => {
  const { title, newStatus } = req.body;
  let found = false;
  for (const [status, list] of Object.entries(flowTracker)) {
    const idx = list.findIndex(task => task.title === title);
    if (idx !== -1) {
      const [task] = list.splice(idx, 1);
      flowTracker[newStatus].push(task);
      found = true;
      return res.json({ status: `Task moved to ${newStatus}`, task });
    }
  }
  if (!found) {
    res.status(404).json({ error: 'Task not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
