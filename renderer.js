//#region Configuration
const robot = require("robotjs")
const { clipboard, ipcRenderer } = require('electron')

robot.setKeyboardDelay(1)

let graphWindowId

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
    initGUI()
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
        return
    }
    //Если очки за этот вопрос ранее были сняты, отменяем снятие и начисляем очки
    if (players[player].scores[currentQuestionNumber] == -amount) {
        players[player].scores[currentQuestionNumber] = amount
        players[player].totalScore += (2 * amount)
        return
    }
    //В остальных случаях просто добавляем очки
    players[player].scores[currentQuestionNumber] = amount
    players[player].totalScore += amount
    //Пересчитываем кол-во правильных/неправильных ответов
}

function subScore(player, amount) {
    //Если очки за этот вопрос уже были списаны, отменяем списание
    if (players[player].scores[currentQuestionNumber] == -amount) {
        players[player].scores[currentQuestionNumber] = null
        players[player].totalScore += amount
        return
    } 
    //Если очки за этот вопрос ранее были начислены,
    //отменяем начисление и списываем очки
    if (players[player].scores[currentQuestionNumber] == amount) {
        players[player].scores[currentQuestionNumber] = -amount
        players[player].totalScore -= 2 * amount
        return
    }
    //В остальных случаях просто списываем очки
    players[player].scores[currentQuestionNumber] = -amount
    players[player].totalScore -= amount
}

function countAnswers(player) {
    players[player].correct = 0
    players[player].incorrect = 0
    for (let i = 0; i < players[player].scores.length; i++) {
        let score = players[player].scores[i]
        if (score > 0) { players[player].correct++ }
        if (score < 0) { players[player].incorrect++ }
    }
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
//let totalScoreGUI = document.getElementsByClassName("total-score")

function onAddScoreClicked(e) {
    let button = e.target
    let player = parseInt(button.getAttribute("data-player"))
    addScore(player, currentQuestionPrice)
    countAnswers(player)
    updateTotalScore(player)
    updateScoreTable(player, currentQuestionPrice)
    sendPlayersToGraphWindow()
}

function onSubScoreClicked(e) {
    let button = e.target
    let player = parseInt(button.getAttribute("data-player"))
    subScore(player, currentQuestionPrice)
    countAnswers(player)
    updateTotalScore(player)
    updateScoreTable(player, -currentQuestionPrice)
    sendPlayersToGraphWindow()
}

function setCurrentQuestionText() {
    let currentQ = document.getElementById("nav-current")
    let subject = getSubjectNumber()
    let question = currentQuestionNumber % numOfQuestions
    if (question == 0) { question = numOfQuestions}
    let number = subject + "." + question * basePrice 
    currentQ.innerText = number
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

function updateTotalScore(player) {
    let totalScoreGUI = document.getElementsByClassName("total-score")
    totalScoreGUI[player].innerHTML = players[player].totalScore + "<br>" +
        " [<span class='correct-answers'>" + players[player].correct + "</span>/" +
        "<span class='incorrect-answers'>" + players[player].incorrect + "</span>]"
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

function onNameInput(e) {
    let player = parseInt(e.target.getAttribute("data-player"))
    let name = e.target.value
    players[player].name = name
}

function onNameKeyPress(e) {
    if (e.key == "Enter") {
        e.target.blur()
    }
}

function copyScoresToClipboard() {
    let scores = ""
    for (let i = 0; i < numOfPlayers; i++) {
        scores += `${(i != 0 ? "\n" : "")}` + //Не добавляем перевод для первой строки
        `${players[i].name}: ${players[i].totalScore} ` +
        `(Ответы: +${players[i].correct}/-${players[i].incorrect})`
    }
    clipboard.writeText(scores)
    console.log(scores)
}

//GUI Creation

// Create questions block
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
        price.innerText = (i + 1) * basePrice
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

// Add players controls
function addPlayerControls() {
    let playersRow = document.getElementById("players")
    let blankPlayer = document.createElement("td")
    blankPlayer.setAttribute("class", "blank player")
    playersRow.appendChild(blankPlayer)
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
        input.setAttribute("data-player", i)
        input.value = `Игрок ${i + 1}`
        input.tabIndex = i + 1
        input.oninput = onNameInput
        input.onkeypress = onNameKeyPress

        div.appendChild(plusButton)
        div.appendChild(input)
        div.appendChild(minusButton)
        td.appendChild(div)
        playersRow.appendChild(td)
    }
}

// Add navigation controls
function addNavigationControls() {
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
    navCurrent.innerText = "1." + basePrice
    navCurrent.onclick = sendPriceToChat
    navDiv.appendChild(navPrev)
    navDiv.appendChild(navCurrent)
    navDiv.appendChild(navNext)
    navTd.appendChild(navDiv)
    navTr.appendChild(navTd)
}

// Add total scores
function addTotalScores() {
    let spacerTr = document.getElementById("spacer")
    spacerTr.childNodes[0].setAttribute("colspan", numOfPlayers + 1)
    
    let totalsTr = document.getElementById("totals")
    let tdSumSign = document.createElement("td")
    tdSumSign.innerText = "Σ"
    tdSumSign.onclick = copyScoresToClipboard
    tdSumSign.setAttribute("title", "Кликните, чтобы скопировать счет в буфер обмена")
    tdSumSign.setAttribute("id", "sum-sign")
    totalsTr.appendChild(tdSumSign)

    for (let i = 0; i < numOfPlayers; i++) {
        let playerScore = document.createElement("td")
        playerScore.setAttribute("class", "total-score")
        playerScore.setAttribute("data-player", i)
        playerScore.innerText = "0"
        totalsTr.appendChild(playerScore)
    }
}

// Add package block
function addPackageBlock() {
    let packageTbody = document.getElementById("package-block")
    let packageTr = document.createElement("tr")
    let packageTd = document.createElement("td")
    let packageSelect = document.createElement("select")

    packageTbody.appendChild(packageTr).appendChild(packageTd).appendChild(packageSelect)

    packageTd.setAttribute("colspan", numOfPlayers + 1)
    packageSelect.setAttribute("id", "select-box")
    packageSelect.setAttribute("size", "4")
    packageSelect.setAttribute("multiple", "")
    packageSelect.setAttribute("style", "display: none")

    window.scrollTo(0, document.body.scrollHeight)
}

function initGUI() {
    addPlayerControls()
    addNavigationControls()
    addTotalScores()
    addPackageBlock()

    addQuestionsBlock()
    setActiveRow(1)
}

function resetGUI() {
    let questionsBlock = document.getElementById("subjects")
    let playerControls = document.getElementById("players")
    let navigationConrtols = document.getElementById("navigation")
    let totalScores = document.getElementById("totals")

    questionsBlock.innerHTML = ""
    playerControls.innerHTML = ""
    navigationConrtols.innerHTML = ""
    totalScores.innerHTML = ""
}
//#endregion

//#region IPC
ipcRenderer.on("pack-from-clipboard", (e, text) => {
    parsePackageText(text)
    boxHeight = document.getElementById("select-box").offsetHeight
    ipcRenderer.send("resize-main-window", boxHeight)
    window.scrollTo(0, document.body.scrollHeight)
})

ipcRenderer.on("toggle-show-package", () => {
    let selectBox = document.getElementById("select-box")
    let isPackVisible = selectBox.offsetParent === null ? false : true
    selectBox.setAttribute("style", "display: " + (isPackVisible ? "none" : "block"))
    window.scrollTo(0, document.body.scrollHeight)
    
})

ipcRenderer.on("new-game-clicked", (e, params) => {
    numOfPlayers = params.players
    numOfQuestions = params.questions
    basePrice = params.basePrice
    players = []
    currentQuestionNumber = 1
    currentQuestionPrice = basePrice

    resetGUI()
    startGame(numOfPlayers)
})

ipcRenderer.on("graph-id", (e, id) => {
    graphWindowId = id
    console.log(graphWindowId)
})

ipcRenderer.on("data-for-graph-window", () => {
    sendPlayersToGraphWindow()
})

function sendPlayersToGraphWindow() {
    ipcRenderer.sendTo(graphWindowId, "data-from-main-window", {
        "players": players,
        "currentQuestionNumber": currentQuestionNumber
    })
}

//#endregion

//#region UTILITY
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min
}
//#endregion

//#region TEST
function fillTestScores(questionsNumber) {
    for (let i = 0; i < questionsNumber; i++) {
        //Минусуем случайных игроков
        for (let y = 0; y < numOfPlayers; y++) {
            if (getRandomInt(0, 5) == 0) {
                let player = y
                subScore(player, currentQuestionPrice)
                countAnswers(player)
                updateTotalScore(player)
                updateScoreTable(player, -currentQuestionPrice)
            }
        }
        //Возможно плюсуем одному случайному игроку
        if (getRandomInt(0, 10) < 7) {
            let player = getRandomInt(0, numOfPlayers)
            addScore(player, currentQuestionPrice)
            countAnswers(player)
            updateTotalScore(player)
            updateScoreTable(player, currentQuestionPrice)
        }
        i + 1 == questionsNumber ? null : onNextQuestionClicked()
    }
}
//#endregion

// On start
startGame(numOfPlayers)
//fillTestScores(50)