const devices = document.getElementById("devices");

function randomDevices() {
    devices.innerText = Math.floor(Math.random() * 10) + 1;
}

randomDevices();