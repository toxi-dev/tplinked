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

let deviceRadarPoints = [];

function nowTime() {
  return new Date().toLocaleTimeString();
}

function addActivity(text) {
  const item = document.createElement("div");
  item.className = "log";
  item.textContent = `[${nowTime()}] ${text}`;
  activity.prepend(item);

  while (activity.children.length > 40) {
    activity.removeChild(activity.lastChild);
  }
}

function updateClock() {
  clock.textContent = nowTime();
}

setInterval(updateClock, 1000);
updateClock();

qsa(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    qsa(".nav-btn").forEach((b) => b.classList.remove("active"));
    qsa(".page").forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    qs("#" + btn.dataset.page).classList.add("active");
  });
});

function formatUptime(seconds) {
  if (!seconds && seconds !== 0) return "Unknown";

  seconds = Number(seconds);
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
    devicesList.innerHTML = `<p class="muted">No connected DHCP devices found yet.</p>`;
    deviceRadarPoints = [];
    return;
  }

  deviceRadarPoints = devices.map((_, index) => {
    const angle = (Math.PI * 2 / devices.length) * index;
    const radius = 70 + ((index * 47) % 130);
    return { angle, radius };
  });

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
    const res = await fetch("status.json?_=" + Date.now(), { cache: "no-store" });

    if (!res.ok) throw new Error("No status file");

    const data = await res.json();

    statusDot.className = "dot ok";
    routerStatus.textContent = "Router linked";

    ssid.textContent = data.ssid || "tplinked";
    deviceCount.textContent = data.device_count ?? 0;
    uptime.textContent = formatUptime(data.uptime);
    memory.textContent = data.memory_used_percent !== undefined
      ? data.memory_used_percent + "%"
      : "Unknown";

    lastUpdate.textContent = data.generated
      ? "Updated: " + data.generated
      : "Updated from router";

    renderDevices(data.devices || []);
  } catch (err) {
    statusDot.className = "dot warning";
    routerStatus.textContent = "Portal only";

    lastUpdate.textContent = "Router status script not installed yet.";
    deviceCount.textContent = "0";
    uptime.textContent = "Unknown";
    memory.textContent = "Unknown";
    renderDevices([]);
  }
}

setInterval(loadRouterStatus, 5000);
loadRouterStatus();

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

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderChat() {
  const messages = loadLocal("tplinked_chat");
  chatBox.innerHTML = "";

  if (messages.length === 0) {
    chatBox.innerHTML = `<p class="muted">No chat messages yet.</p>`;
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
}

sendChat.addEventListener("click", () => {
  const name = chatName.value.trim() || "Guest";
  const text = chatText.value.trim();

  if (!text) return;

  const messages = loadLocal("tplinked_chat");
  messages.push({
    name,
    text,
    time: nowTime()
  });

  saveLocal("tplinked_chat", messages);
  chatText.value = "";
  renderChat();
  addActivity("Local chat message saved");
});

chatText.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat.click();
});

clearChat.addEventListener("click", () => {
  localStorage.removeItem("tplinked_chat");
  renderChat();
  addActivity("Local chat cleared");
});

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
  addActivity("Bulletin post saved");
});

bulletinText.addEventListener("keydown", (e) => {
  if (e.key === "Enter") postBulletin.click();
});

clearBulletin.addEventListener("click", () => {
  localStorage.removeItem("tplinked_bulletin");
  renderBulletin();
  addActivity("Bulletin cleared");
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
  addActivity("File note saved");
});

fileNote.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addFileNote.click();
});

clearFiles.addEventListener("click", () => {
  localStorage.removeItem("tplinked_files");
  renderFiles();
  addActivity("File notes cleared");
});

renderChat();
renderBulletin();
renderFiles();
addActivity("tplinked portal loaded");

const canvas = qs("#radar");
const ctx = canvas.getContext("2d");
let angle = 0;

function drawRadar() {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const max = Math.min(w, h) / 2 - 20;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#050b12";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(0,255,136,0.45)";
  ctx.lineWidth = 1;

  for (let r = max / 4; r <= max; r += max / 4) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(cx - max, cy);
  ctx.lineTo(cx + max, cy);
  ctx.moveTo(cx, cy - max);
  ctx.lineTo(cx, cy + max);
  ctx.stroke();

  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * max, cy + Math.sin(angle) * max);
  ctx.stroke();

  ctx.fillStyle = "#00ff88";

  deviceRadarPoints.forEach((point) => {
    const x = cx + Math.cos(point.angle) * point.radius;
    const y = cy + Math.sin(point.angle) * point.radius;

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#d9ffe9";
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  angle += 0.025;
  requestAnimationFrame(drawRadar);
}

drawRadar();