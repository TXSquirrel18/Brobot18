const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Static UI file support
app.use("/ui", express.static(path.join(__dirname, "ui")));

// Auth middleware
const authMiddleware = (req, res, next) => {
  const override = req.headers["x-ob-override"];
  const fallback = req.headers["x-brobot-key"];
  if (override === "shard77_internal" || fallback === "abc123secure") {
    return next();
  }
  res.status(403).json({ error: "Forbidden" });
};

// Test route
app.get("/ping", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Hub route - General dynamic handler
app.get("/hub/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  res.json({ hub: id, message: `Welcome to Hub ${id}` });
});

// Specific route: Hub S - Status
app.get("/hub/S/status", authMiddleware, (req, res) => {
  res.json({
    hub: "Social",
    status: "active",
    timestamp: new Date().toISOString(),
  });
});

// Specific route: Hub W - Notes
app.get("/hub/W/notes", authMiddleware, (req, res) => {
  res.json({
    hub: "Work Ops",
    notes: [
      "Complete client outreach batch",
      "Push Brobot V3 + C7 config",
      "Sync time blocks with legal calendar",
    ],
    updated: new Date().toISOString(),
  });
});

// Catch-all fallback
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Brobot Server running on port ${PORT}`);
});
