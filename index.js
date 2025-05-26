const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// POST route for commands
app.post('/api/command', (req, res) => {
  const command = req.body.command?.toLowerCase() || '';
  let reply;

  // Smart response logic
  if (command.includes('hi') || command.includes('hello')) {
    reply = "Hey there! I'm Brobot. What can I do for you?";
  } else if (command.includes('time')) {
    reply = `The current time is ${new Date().toLocaleTimeString()}.`;
  } else if (command.includes('date')) {
    reply = `Today's date is ${new Date().toLocaleDateString()}.`;
  } else if (command.includes('who are you')) {
    reply = "I'm Brobot — your command deck assistant.";
  } else if (command.includes('help')) {
    reply = "Try commands like 'time', 'date', 'who are you', or just say hi!";
  } else {
    reply = `You said: "${command}". I'm still learning what to do with that.`;
  }

  res.json({ reply });
});

// Root route
app.get('/', (req, res) => {
  res.send('Brobot backend is running.');
});

// Start server
app.listen(PORT, () => {
  console.log(`Brobot backend listening on port ${PORT}`);
});
