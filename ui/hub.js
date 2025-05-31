document.addEventListener("DOMContentLoaded", () => {
  const hubTitle = document.getElementById("hub-title");
  const hubDesc = document.getElementById("hub-desc");
  const path = window.location.pathname;
  const hubId = path.split("/").pop().split(".")[0].split("-").pop().toUpperCase();

  const hubNames = {
    "W": "Work & Financial Ops",
    "C": "Creative Worlds",
    "L": "Legal Affairs",
    "S": "Social Life & Connections",
    "P": "Personal Wellness",
    "H": "Home Base & Operations",
    "T": "Temporal Ops"
  };

  hubTitle.textContent = `[${hubId}] ${hubNames[hubId] || "Unknown Hub"}`;
  hubDesc.textContent = `This is the active overlay for the ${hubNames[hubId] || "hub"} domain.`;

  fetch(`https://brobot18.onrender.com/hub/${hubId}/status`, {
    headers: {
      "x-ob-override": "shard77_internal"
    }
  })
    .then(res => res.json())
    .then(data => {
      const statusBox = document.createElement("pre");
      statusBox.style.color = "#0ff";
      statusBox.style.marginTop = "2em";
      statusBox.textContent = JSON.stringify(data, null, 2);
      document.body.appendChild(statusBox);
    })
    .catch(err => console.log("Status fetch error:", err));
});
