const qs = (x) => document.querySelector(x);
const qsa = (x) => document.querySelectorAll(x);

const statusDot = qs("#statusDot");
const routerStatus = qs("#routerStatus");
const clock = qs("#clock");
const ssid = qs("#ssid");
const lastUpdate = qs("#lastUpdate");
const deviceCount = qs("#deviceCount");
const uptime = qs("#uptime");
const memory = qs("#memory");
const devicesList = qs("#devicesList");
const activity = qs("#activity");

const chatName = qs("#chatName");
const chatText = qs("#chatText");
const sendChat = qs("#sendChat");
const chatBox = qs("#chatBox");
const clearChat = qs("#clearChat");

const bulletinText = qs("#bulletinText");
const postBulletin = qs("#postBulletin");
const bulletinList = qs("#bulletinList");
const clearBulletin = qs("#clearBulletin");

const fileNote = qs("#fileNote");
const addFileNote = qs("#addFileNote");
const fileList = qs("#fileList");
const clearFiles = qs("#clearFiles");

function nowTime() {
  return new Date().toLocaleTimeString();
}

function updateClock() {
  clock.textContent = nowTime();
}

setInterval(updateClock, 1000);
updateClock();

function addActivity(text) {
  const item = document.createElement("div");
  item.className = "log";
  item.textContent = `[${nowTime()}] ${text}`;
  activity.prepend(item);

  while (activity.children.length > 40) {
    activity.removeChild(activity.lastChild);
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

qsa(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    qsa(".nav-btn").forEach((b) => b.classList.remove("active"));
    qsa(".page").forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    qs("#" + btn.dataset.page).classList.add("active");
  });
});

function formatUptime(seconds) {
  seconds = Number(seconds);

  if (Number.isNaN(seconds)) {
    return "Unavailable";
  }

  const days = Math.floor(seconds / 86400);
  seconds %= 86400;

  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;

  const mins = Math.floor(seconds / 60);

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function renderDevices(devices) {
  devicesList.innerHTML = "";

  if (!devices || devices.length === 0) {
    devicesList.innerHTML = `<p class="muted">No connected DHCP devices found.</p>`;
    return;
  }

  devices.forEach((device) => {
    const div = document.createElement("div");
    div.className = "device";

    const name = device.name && device.name !== "*" ? device.name : "Unknown device";
    const ip = device.ip || "No IP";
    const mac = device.mac || "No MAC";

    div.innerHTML = `
      <strong>${escapeHtml(name)}</strong>
      <br>
      IP: ${escapeHtml(ip)}
      <br>
      MAC: ${escapeHtml(mac)}
    `;

    devicesList.appendChild(div);
  });
}

async function loadRouterStatus() {
  try {
    const res = await fetch("status.json?_=" + Date.now(), {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error("Status file missing");
    }

    const data = await res.json();

    statusDot.className = "dot ok";
    routerStatus.textContent = "Router linked";

    ssid.textContent = data.ssid || "tplinked";
    deviceCount.textContent = data.device_count ?? 0;
    uptime.textContent = formatUptime(data.uptime);

    if (data.memory_used_percent !== undefined && data.memory_used_percent !== null) {
      memory.textContent = data.memory_used_percent + "%";
    } else {
      memory.textContent = "Unavailable";
    }

    if (data.generated) {
      lastUpdate.textContent = "Updated " + data.generated;
    } else {
      lastUpdate.textContent = "Updated";
    }

    renderDevices(data.devices || []);
  } catch (err) {
    statusDot.className = "dot warning";
    routerStatus.textContent = "Status unavailable";

    ssid.textContent = "tplinked";
    deviceCount.textContent = "0";
    uptime.textContent = "Unavailable";
    memory.textContent = "Unavailable";
    lastUpdate.textContent = "Status script not found";

    renderDevices([]);
  }
}

setInterval(loadRouterStatus, 5000);
loadRouterStatus();

async function renderChat() {
  try {
    const res = await fetch("/cgi-bin/tplinked-chat?action=read&_=" + Date.now(), {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error("Chat script unavailable");
    }

    const data = await res.json();
    const messages = data.messages || [];

    chatBox.innerHTML = "";

    if (messages.length === 0) {
      chatBox.innerHTML = `<p class="muted">No shared chat messages yet.</p>`;
      return;
    }

    messages.slice().reverse().forEach((msg) => {
      const div = document.createElement("div");
      div.className = "message";

      div.innerHTML = `
        <strong>${escapeHtml(msg.name)}</strong>
        <span class="muted"> ${escapeHtml(msg.time)}</span>
        <br>
        ${escapeHtml(msg.text)}
      `;

      chatBox.appendChild(div);
    });
  } catch (err) {
    chatBox.innerHTML = `<p class="muted">Shared chat is not reachable.</p>`;
  }
}

sendChat.addEventListener("click", async () => {
  const name = chatName.value.trim() || "Guest";
  const text = chatText.value.trim();

  if (!text) return;

  const body = new URLSearchParams();
  body.set("name", name);
  body.set("text", text);

  try {
    await fetch("/cgi-bin/tplinked-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    chatText.value = "";
    await renderChat();
    addActivity("Chat message sent");
  } catch (err) {
    addActivity("Chat send failed");
  }
});

chatText.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat.click();
});

clearChat.addEventListener("click", async () => {
  try {
    await fetch("/cgi-bin/tplinked-chat?action=clear&_=" + Date.now(), {
      cache: "no-store"
    });

    await renderChat();
    addActivity("Chat cleared");
  } catch (err) {
    addActivity("Chat clear failed");
  }
});

setInterval(renderChat, 2000);

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function renderBulletin() {
  const posts = loadLocal("tplinked_bulletin");
  bulletinList.innerHTML = "";

  if (posts.length === 0) {
    bulletinList.innerHTML = `<p class="muted">No bulletin posts yet.</p>`;
    return;
  }

  posts.slice().reverse().forEach((post) => {
    const div = document.createElement("div");
    div.className = "post";

    div.innerHTML = `
      <strong>Announcement</strong>
      <span class="muted"> ${escapeHtml(post.time)}</span>
      <br>
      ${escapeHtml(post.text)}
    `;

    bulletinList.appendChild(div);
  });
}

postBulletin.addEventListener("click", () => {
  const text = bulletinText.value.trim();
  if (!text) return;

  const posts = loadLocal("tplinked_bulletin");
  posts.push({ text, time: nowTime() });

  saveLocal("tplinked_bulletin", posts);
  bulletinText.value = "";
  renderBulletin();
  addActivity("Bulletin post saved on this device");
});

bulletinText.addEventListener("keydown", (e) => {
  if (e.key === "Enter") postBulletin.click();
});

clearBulletin.addEventListener("click", () => {
  localStorage.removeItem("tplinked_bulletin");
  renderBulletin();
  addActivity("Bulletin cleared on this device");
});

function renderFiles() {
  const files = loadLocal("tplinked_files");
  fileList.innerHTML = "";

  if (files.length === 0) {
    fileList.innerHTML = `<p class="muted">No file notes yet.</p>`;
    return;
  }

  files.slice().reverse().forEach((file) => {
    const div = document.createElement("div");
    div.className = "post";

    div.innerHTML = `
      <strong>File Note</strong>
      <span class="muted"> ${escapeHtml(file.time)}</span>
      <br>
      ${escapeHtml(file.text)}
    `;

    fileList.appendChild(div);
  });
}

addFileNote.addEventListener("click", () => {
  const text = fileNote.value.trim();
  if (!text) return;

  const files = loadLocal("tplinked_files");
  files.push({ text, time: nowTime() });

  saveLocal("tplinked_files", files);
  fileNote.value = "";
  renderFiles();
  addActivity("File note saved on this device");
});

fileNote.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addFileNote.click();
});

clearFiles.addEventListener("click", () => {
  localStorage.removeItem("tplinked_files");
  renderFiles();
  addActivity("File notes cleared on this device");
});

renderChat();
renderBulletin();
renderFiles();
addActivity("Portal loaded");