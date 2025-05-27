
document.addEventListener("DOMContentLoaded", () => {
  const hubID = document.body.getAttribute("data-hub");

  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  document.getElementById("submitTask").onclick = async () => {
    const task = {
      title: document.getElementById("taskTitle").value,
      notes: document.getElementById("taskNotes").value,
      priority: document.getElementById("taskPriority").value,
      dueDate: document.getElementById("taskDue").value
    };
    const response = await postJSON(`/hub/${hubID}/task`, task);
    alert(response.message || "Task submitted.");
  };

  document.getElementById("moveTask").onclick = async () => {
    const move = {
      title: document.getElementById("moveTitle").value,
      newStatus: document.getElementById("newStatus").value
    };
    const response = await postJSON(`/hub/${hubID}/task/move`, move);
    alert(response.message || "Task moved.");
  };

  document.getElementById("submitLog").onclick = async () => {
    const log = {
      type: document.getElementById("logType").value,
      content: document.getElementById("logText").value
    };
    const response = await postJSON(`/hub/${hubID}/log`, log);
    alert(response.message || "Log saved.");
  };
});
