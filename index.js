const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for JSON parsing
app.use(express.json());

// Auth middleware
app.use((req, res, next) => {
    const key = req.headers['x-ob-override'] || req.headers['x-brobot-key'];
    if (!key || key !== 'shard77_internal') return res.status(403).send('Forbidden');
    next();
});

// Serve static UI
app.use('/ui', express.static(path.join(__dirname, 'ui')));

// Ping route
app.get('/ping', (req, res) => res.send('Brobot 2.0 is alive.'));

// Generic hub route
app.get('/hub/:id', (req, res) => res.json({ hub: req.params.id, status: 'active' }));

// Social hub status route
app.get('/hub/S/status', (req, res) => {
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    res.json({ status: data.socialStatus || 'undefined' });
});

// Work notes route
app.get('/hub/W/notes', (req, res) => {
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    res.json({ notes: data.workNotes || [] });
});

// Ping specific hub
app.get('/hub/:id/ping', (req, res) => {
    res.json({ message: `Pinged hub: ${req.params.id}` });
});

// Update hub data
app.post('/hub/:id/update', (req, res) => {
    const hubId = req.params.id;
    const update = req.body.update;
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    data[`${hubId}Update`] = update;
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    res.send(`Updated hub ${hubId}.`);
});

// Add note by intent
app.post('/hub/add-note', (req, res) => {
    const { hub, note } = req.body;
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    if (!data[`${hub}Notes`]) data[`${hub}Notes`] = [];
    data[`${hub}Notes`].push(note);
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    res.send(`Note added to hub ${hub}.`);
});

// Scheduler add/view
app.post('/scheduler/add', (req, res) => {
    const sched = JSON.parse(fs.readFileSync('scheduler.json', 'utf8'));
    sched.push(req.body);
    fs.writeFileSync('scheduler.json', JSON.stringify(sched, null, 2));
    res.send('Task scheduled.');
});

app.get('/scheduler/view', (req, res) => {
    const sched = JSON.parse(fs.readFileSync('scheduler.json', 'utf8'));
    res.json(sched);
});

// Hub memory
app.get('/hub/:id/memory', (req, res) => {
    const mem = JSON.parse(fs.readFileSync('memory.json', 'utf8'));
    res.json(mem[req.params.id] || {});
});

// Logs
app.get('/logs', (req, res) => {
    const logs = JSON.parse(fs.readFileSync('logs.json', 'utf8'));
    res.json(logs);
});

app.post('/logs/sync', (req, res) => {
    fs.writeFileSync('logs.json', JSON.stringify(req.body, null, 2));
    res.send('Logs synced.');
});

// Plugins
app.post('/plugins/load', (req, res) => {
    const plugin = req.body.name;
    try {
        require(`./plugins/${plugin}.js`);
        res.send(`Plugin ${plugin} loaded.`);
    } catch (e) {
        res.status(500).send(`Error loading plugin: ${e.message}`);
    }
});

// System health
app.get('/sys/health', (req, res) => res.send('OK'));

app.listen(PORT, () => console.log(`Brobot 2.0 running on port ${PORT}`));
