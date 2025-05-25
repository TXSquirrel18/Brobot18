app.get('/', (req, res) => {
  res.send('Brobot18 API is running.');
});
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.post('/activate-intent-layer', (req, res) => {
  const { trackEdits, autoSuggest, toneDetection, cacheSize, lockInPrompt } = req.body;

  if (trackEdits === undefined || autoSuggest === undefined || toneDetection === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  res.json({
    status: 'activated',
    config: { trackEdits, autoSuggest, toneDetection, cacheSize, lockInPrompt }
  });
});

app.listen(port, () => {
  console.log(`Brobot API is running`);
});
