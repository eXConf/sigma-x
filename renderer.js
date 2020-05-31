//#region Configuration
const robot = require("robotjs")
const { clipboard, ipcRenderer } = require('electron')

robot.setKeyboardDelay(1)

let numOfPlayers = 4 //number of players in game, 4 by default
let numOfQuestions = 5 //number of question in one subject, 5 by default
let players = []

let currentQuestionNumber = 1
let basePrice = 10
let currentQuestionPrice = basePrice
//#endregion


function startGame(numOfPlayers) {
    for (let i = 0; i < numOfPlayers; i++) {
        addPlayer();
    }
}

function addPlayer() {
    players.push({
        name: `Игрок ${players.length + 1}`, 
        totalScore: 0,
        scores: [],
        correct: 0,
        incorrect: 0
    }
        )
}

function addScore(player, amount) {
    //Если очки за этот вопрос уже были начислены, отменяем начисление
    if (players[player].scores[currentQuestionNumber] == amount) {
        players[player].scores[currentQuestionNumber] = null
        players[player].totalScore -= amount
        console.log("Начисление " + amount + " очков отменено")
        return
    }
    //Если очки за этот вопрос ранее были сняты, отменяем снятие и начисляем очки
    if (players[player].scores[currentQuestionNumber] == -amount) {
        players[player].scores[currentQuestionNumber] = amount
        players[player].totalScore += (2 * amount)
        console.log("Отменили предыдущий минус и начислили " + amount + " очков")
        return
    }
    //В остальных случаях просто добавляем очки
    players[player].scores[currentQuestionNumber] = amount
    players[player].totalScore += amount
    console.log(players[player].name + " получил " + amount + " очков. Всего " +
        players[player].totalScore + " очков")
}

function subScore(player, amount) {
    //Если очки за этот вопрос уже были списаны, отменяем списание
    if (players[player].scores[currentQuestionNumber] == -amount) {
        players[player].scores[currentQuestionNumber] = null
        players[player].totalScore += amount
        console.log("Списание " + amount + " очков отменено")
        return
    } 
    //Если очки за этот вопрос ранее были начислены,
    //отменяем начисление и списываем очки
    if (players[player].scores[currentQuestionNumber] == amount) {
        players[player].scores[currentQuestionNumber] = -amount
        players[player].totalScore -= 2 * amount
        console.log("Отменили предыдущее начисление и списываем " + amount + " очков")
        return
    }
    //В остальных случаях просто списываем очки
    players[player].scores[currentQuestionNumber] = -amount
    players[player].totalScore -= amount
    console.log(players[player].name + " потерял " + amount + " очков. Всего " +
        players[player].totalScore + " очков")
}

function getSubjectNumber() {
    return Math.floor((currentQuestionNumber - 1) / numOfQuestions) + 1
}

function changeCurrentQuestionPrice() {
    let number = (currentQuestionNumber % numOfQuestions) * basePrice 
    currentQuestionPrice = number > 0 ? number : numOfQuestions * basePrice
}

function parsePackageText(text) {
    text = text.split("\n")
    let selectBox = document.getElementById("select-box")
    selectBox.innerHTML = ""
    for (let i = 0; i < text.length; i++) {
        if (text[i] != "" && text[i] != "\r" 
            && text[i] != "\n" && text[i] != " ") {
            let option = document.createElement("option")
            let blank = document.createElement("option")
            option.innerText = text[i]
            selectBox.appendChild(option)
            selectBox.appendChild(blank)
        }
    }
    selectBox.setAttribute("style", "display: block")
}

function sendPriceToChat() {
    text = "Тема #" + getSubjectNumber() + ", вопрос за " + currentQuestionPrice
    clipboard.writeText(text)
    robot.keyToggle("alt", "down")
    robot.keyTap("tab")
    robot.keyToggle("alt", "up")
    robot.keyToggle("control", "down")
    robot.keyTap("v")
    robot.keyToggle("control", "up")
    robot.keyTap("enter")
    robot.keyToggle("alt", "down")
    robot.keyTap("tab")
    robot.keyToggle("alt", "up")
}

//#region GUI

// references
let totalScoreGUI = document.getElementsByClassName("total-score")

function onAddScoreClicked(e) {
  let button = e.target
  let player = parseInt(button.getAttribute("data-player"))
  addScore(player, currentQuestionPrice)
  totalScoreGUI[player].innerHTML = players[player].totalScore

  updateScoreTable(player, currentQuestionPrice)
}

function onSubScoreClicked(e) {
    let button = e.target
    let player = parseInt(button.getAttribute("data-player"))
    subScore(player, currentQuestionPrice)
    totalScoreGUI[player].innerHTML = players[player].totalScore

    updateScoreTable(player, -currentQuestionPrice)
}

function setCurrentQuestionText() {
    let currentQ = document.getElementById("nav-current")
    let subject = getSubjectNumber()
    let question = currentQuestionNumber % numOfQuestions
    if (question == 0) { question = numOfQuestions}
    let number = subject + "." + question * basePrice 
    currentQ.innerText = number
    console.log("Текущий уровень " + number)
}

function onNextQuestionClicked() {
    currentQuestionNumber++
    changeCurrentQuestionPrice()
    setCurrentQuestionText()
    let questionsInGUI = document.getElementsByClassName("answer").length
    if (questionsInGUI < currentQuestionNumber) {
        addQuestionsBlock()
        window.scrollTo(0, document.body.scrollHeight)
    }
    setActiveRow(currentQuestionNumber)
}

function onPrevQuestionClicked() {
    if (currentQuestionNumber == 1) { return }
    currentQuestionNumber--
    changeCurrentQuestionPrice()
    setCurrentQuestionText()
    setActiveRow(currentQuestionNumber)
}

function onQuestionRowClicked(e) {
    let rowNumber = e.target.getAttribute("data-question-number")
    setActiveRow(rowNumber)
    currentQuestionNumber = rowNumber
    changeCurrentQuestionPrice()
    setCurrentQuestionText()
}

function addQuestionsBlock() {
    let subjectsTbody = document.getElementById("subjects")
    let subjectsTr = document.createElement("tr")
    let subjectsTh = document.createElement("th")
    subjectsTh.setAttribute("colspan", numOfPlayers + 1)
    subjectsTh.setAttribute("class", "subject")
    subjectsTh.innerText = "Тема " + getSubjectNumber()
    subjectsTr.appendChild(subjectsTh)
    subjectsTbody.appendChild(subjectsTr)

    for (let i = 0; i < numOfQuestions; i++) {
        let answer = document.createElement("tr")
        answer.setAttribute("class", "answer")
        answer.onclick = onQuestionRowClicked
        let price = document.createElement("td")
        price.setAttribute("class", "question-price")
        price.innerText = (i + 1) * 10
        answer.appendChild(price)

        for (let y = 0; y < numOfPlayers; y++) {
            let player = document.createElement("td")
            player.setAttribute("data-player", y)
            let questionNumber = (getSubjectNumber() - 1) * 5 + (i + 1)
            player.setAttribute("data-question-number", questionNumber)
            //player.innerText = questionNumber
            answer.appendChild(player)
        }
        subjectsTbody.appendChild(answer)
    }
}

function updateScoreTable(player, score) {
    let cell = document.querySelector("td[data-question-number='" + currentQuestionNumber 
            + "'][data-player='" + player + "']")
    if (cell.innerText == score) {
        cell.innerText = ""
        cell.setAttribute("data-answer", "none")
    } else {
        if (score > 0) {
            cell.innerText = String.fromCharCode(160) + score
            cell.setAttribute("data-answer", "won")
        } else {
            cell.innerText = score
            cell.setAttribute("data-answer", "lost")
        }
    }
}

function setActiveRow(_number) {
    let number = _number
    let active = document.getElementsByClassName("active")
    if (active.length < 1) { number = 1 } 
    if (active.length == 1) { active[0].classList.remove("active") } 
    let newActive = document.querySelector("td[data-question-number='" +
     number + "']").parentElement
     newActive.classList.add("active")
}

function onNameKeyDown(e) {
    console.log(e.key)
    if (e.key == "Enter") {
        e.target.blur()
    }
}

function initGUI() {
    //#region Add players controls
    let playersRow = document.getElementById("players")
    for (let i = 0; i < numOfPlayers; i++) {
        let td = document.createElement("td")
        td.setAttribute("class", "player")
        let div = document.createElement("div")
        div.setAttribute("class", "player-container")
        let plusButton = document.createElement("button")
        let minusButton = document.createElement("button")
        plusButton.onclick = onAddScoreClicked
        minusButton.onclick = onSubScoreClicked
        plusButton.setAttribute("class", "plus-btn")
        plusButton.setAttribute("data-player", i)
        plusButton.innerText = "+"
        minusButton.setAttribute("class", "minus-btn")
        minusButton.setAttribute("data-player", i)
        minusButton.innerText = "-"
        let input = document.createElement("input")
        input.setAttribute("class", "player-name")
        input.setAttribute("type", "text")
        input.setAttribute("spellcheck", "false")
        input.setAttribute("value", "Игрок " + (i + 1))
        input.onkeydown = onNameKeyDown

        div.appendChild(plusButton)
        div.appendChild(input)
        div.appendChild(minusButton)
        td.appendChild(div)
        playersRow.appendChild(td)
    }
    //#endregion

    //#region Add navigation controls
    let navTr = document.getElementById("navigation")
    let navTd = document.createElement("td")
    navTd.setAttribute("colspan", numOfPlayers + 1)
    let navDiv = document.createElement("div")
    navDiv.setAttribute("id", "nav-container")
    let navPrev = document.createElement("div")
    let navNext = document.createElement("div")
    let navCurrent = document.createElement("div")
    navPrev.setAttribute("id", "nav-prev")
    navPrev.innerText = "<<"
    navPrev.onclick = onPrevQuestionClicked
    navNext.setAttribute("id", "nav-next")
    navNext.innerText = ">>"
    navNext.onclick = onNextQuestionClicked
    navCurrent.setAttribute("id", "nav-current")
    navCurrent.innerText = "1.10"
    navCurrent.onclick = sendPriceToChat
    navDiv.appendChild(navPrev)
    navDiv.appendChild(navCurrent)
    navDiv.appendChild(navNext)
    navTd.appendChild(navDiv)
    navTr.appendChild(navTd)
    //#endregion

    //#region Add total scores
    let spacerTr = document.getElementById("spacer")
    spacerTr.childNodes[0].setAttribute("colspan", numOfPlayers + 1)
    
    let totalsTr = document.getElementById("totals")
    let tdSumSign = document.createElement("td")
    tdSumSign.innerText = "Σ"
    totalsTr.appendChild(tdSumSign)

    for (let i = 0; i < numOfPlayers; i++) {
        let playerScore = document.createElement("td")
        playerScore.setAttribute("class", "total-score")
        playerScore.setAttribute("data-player", i)
        playerScore.innerText = "0"
        totalsTr.appendChild(playerScore)
    }
    //#endregion

    addQuestionsBlock()
    setActiveRow(1)
}
//#endregion


//#region IPC
ipcRenderer.on("pack-from-clipboard", (e, text) => {
    parsePackageText(text)
    boxHeight = document.getElementById("select-box").offsetHeight
    ipcRenderer.send("resize-main-window", boxHeight)
})

ipcRenderer.on("toggle-show-package", () => {
    let selectBox = document.getElementById("select-box")
    let isPackVisible = selectBox.offsetParent === null ? false : true
    selectBox.setAttribute("style", "display: " + (isPackVisible ? "none" : "block"))
    
})
//#endregion

// On start
startGame(numOfPlayers)
initGUI()