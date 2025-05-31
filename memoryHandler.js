const fs = require("fs");
const path = "./memory.json";

function saveMemory(memory) {
  fs.writeFileSync(path, JSON.stringify(memory, null, 2));
}

function loadMemory() {
  return JSON.parse(fs.readFileSync(path));
}

module.exports = { saveMemory, loadMemory };
