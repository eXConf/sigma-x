const { clipboard, ipcRenderer } = require('electron')

let Chart = require('chart.js')
Chart.defaults.global.defaultFontSize = 14
let canvas = document.getElementById("myChart")

let players = []
let maxQuestions = 0
let myChart

let colors = ["#92e084", "#e08492", "#86a2e3",
            "#c287e6", "#e0aa84", "#83cae0",
            "#c7e07a", "#52e3c1", "#e0b051",
            "#e6d779"]

// Готовим данные для графика            
function prepareDatasets() {
    let arr = [] //будущий dataset
    for (let i = 0; i < players.length; i++) { // Для каждого игрока
        let playerData = {}
        playerData.label = players[i].name // Заполняем имя
        playerData.backgroundColor = colors[i] // Указываем цвет фона
        playerData.borderColor = colors[i] // Указываем цвет границы
        playerData.fill = false // Отменяем заливку
        // Превращаем очки за вопрос в сумму очков на момент вопроса
        let scores = []
        for (let y = 0; y < (maxQuestions + 1); y++) {
            let score = players[i].scores[y]
            // Если очки на этом вопросе не были начислены
            if (score == undefined) { 
                // Если это первый вопрос и нет очков, пишем 0 очков
                if (y == 0) {
                    score = 0
                } 
                // Если нет очков и это не первый вопрос,
                // то берем сумму очков из предыдущего вопроса
                else {
                    score = scores[y - 1]
                }
            }
            // Если очки на этом вопросе были начислены, то
            // добавляем их к сумме предыдущих очков
            else {
                score += scores[y - 1]
            }
            scores.push(score)
        }
        playerData.data = scores
        arr.push(playerData)
    }
    console.log(arr)
    return arr
}

function updateGraph() {
    let playerNames = []
    for (let i = 0; i < players.length; i++) {
        playerNames.push(players[i].name)
    }
    let questions = []
    for (let i = 0; i < (maxQuestions + 2); i++) {
        questions.push(i)
    }
    myChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: questions,
            datasets: prepareDatasets()
            // datasets: [{
            //     label: 'My First dataset',
            //     backgroundColor: "#f55",
            //     borderColor: "#f55",
            //     data: [
            //         10, 20, 50, null, null, 100, 50
            //     ],
            //     fill: false,
            // }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    },
                    scaleLabel: {
                        display: true,
                        labelString: "Набранные очки"
                    }
                }]
            },
            legend: {
                labels: {
                    fontSize: 20
                }
            },
            animation: false,
            layout: {
                padding: 1
            }
        }
    })
}

//#region IPC
ipcRenderer.sendTo(1, "data-for-graph-window")
ipcRenderer.on("data-from-main-window", (e, args) => {
    players = args.players
    if (args.currentQuestionNumber > maxQuestions) {
        maxQuestions = args.currentQuestionNumber
    }
    updateGraph()
})


// ipcRenderer.on("send-players-to-graph", (e, args) => {
//     players = args.players
//     if (args.currentQuestionNumber > maxQuestions) {
//         maxQuestions = args.currentQuestionNumber
//     }
//     updateGraph()
//     //console.log(players)
//     //prepareDatasets()
// })

// ipcRenderer.send("graph-asks-for-players")
//#endregion