const { ipcRenderer } = require("electron")

let status = document.getElementById("status")

ipcRenderer.on("dl-status", (e, progress) => {
    status.setAttribute("value", progress)
})