function updateClock(){
    const now = new Date();
    document.getElementById("clock").innerText =
        now.toLocaleTimeString();
}

setInterval(updateClock,1000);
updateClock();

const terminal = document.getElementById("terminal");

const messages = [
    "Samsung A14 joined network",
    "Laptop connected",
    "Router health check passed",
    "Wiki service started",
    "New device discovered",
    "DHCP lease assigned",
    "Network scan complete"
];

function addLog(){
    const div = document.createElement("div");
    div.className = "log";

    const time = new Date().toLocaleTimeString();

    div.innerText =
        "[" + time + "] " +
        messages[Math.floor(Math.random()*messages.length)];

    terminal.prepend(div);

    if(terminal.children.length > 20){
        terminal.removeChild(terminal.lastChild);
    }
}

setInterval(addLog,3000);

const canvas = document.getElementById("radar");
const ctx = canvas.getContext("2d");

let angle = 0;

function radar(){

    ctx.fillStyle="#071018";
    ctx.fillRect(0,0,500,500);

    ctx.strokeStyle="#00ff88";

    for(let r=50;r<=250;r+=50){
        ctx.beginPath();
        ctx.arc(250,250,r,0,Math.PI*2);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(250,250);

    let x = 250 + Math.cos(angle)*250;
    let y = 250 + Math.sin(angle)*250;

    ctx.lineTo(x,y);
    ctx.stroke();

    ctx.fillStyle="#00ff88";

    ctx.beginPath();
    ctx.arc(180,120,4,0,Math.PI*2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(320,200,4,0,Math.PI*2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(120,350,4,0,Math.PI*2);
    ctx.fill();

    angle += 0.03;

    requestAnimationFrame(radar);
}

radar();