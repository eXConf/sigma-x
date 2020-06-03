const { ipcRenderer } = require('electron')


let startGameBtn = document.getElementById("start-game")
startGameBtn.onclick = function() {
    let players = document.getElementById("players").value
    let questions = document.getElementById("questions").value
    let basePrice = document.getElementById("base-price").value
    ipcRenderer.send("new-game-clicked", 
                    {"players": players, 
                    "questions": questions,
                    "basePrice": basePrice})
}