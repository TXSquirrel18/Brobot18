const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const cron = require("node-cron");

const { checkAuth } = require("./auth");
const limiter = require("./rateLimiter");
const { saveMemory, loadMemory } = require("./memoryHandler");

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(limiter);

let memory = loadMemory();
const logs = require("./logs.json");
const scheduler = require("./scheduler.json");

const OPENAI_KEY = process.env.OPENAI_KEY;
const INTERNAL_KEY = "shard77_internal";
const BROBOT_KEY = "abc123secure";

// Routes
app.get("/ping", (req, res) => {
  res.json({ status: "online", timestamp: new Date().toISOString() });
});

app.get("/hub/:id", (req, res) => {
  const id = req.params.id;
  res.json({ hub: id, message: `Accessing Hub ${id}` });
});

app.get("/hub/:id/logs", checkAuth, (req, res) => {
  res.json(logs[req.params.id] || []);
});

app.post("/admin/reset/:hub", checkAuth, (req, res) => {
  const hub = req.params.hub;
  memory[hub] = {};
  saveMemory(memory);
  res.send({ status: "reset", hub });
});

app.post("/brobot-gpt", checkAuth, async (req, res) => {
  const query = req.body.query;
  if (!query || query.length < 2) return res.status(400).send({ error: "Query too short" });

  const mode = memory.mode || "assistant";
  const prompt = mode === "agent"
    ? `Brobot, make a recommendation and act: ${query}`
    : `Brobot, answer this: ${query}`;

  try {
    const result = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await result.json();
    res.json({ reply: data.choices?.[0]?.message?.content || "[No reply]" });
  } catch (err) {
    res.status(500).send({ error: "GPT Proxy Failure", detail: err.message });
  }
});

// Cron Tasks
cron.schedule("0 * * * *", () => {
  Object.entries(scheduler).forEach(([hub, tasks]) => {
    tasks.forEach(task => console.log(`[${hub}] Running ${task}`));
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Brobot server live on port", PORT));
