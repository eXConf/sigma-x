// Modules
const {app, dialog, Menu, BrowserWindow, clipboard, ipcMain} = require('electron')
const { autoUpdater } = require("electron-updater")
const isMac = process.platform === 'darwin'

//#region AutoUpdater config
autoUpdater.autoDownload = false
autoUpdater.logger = require("electron-log")
autoUpdater.logger.transports.file.level = "info"
//#endregion

//#region Window(s)
let mainWindow
let newGameWindow
let graphWindow
let dlStatusWindow

let mainWindowWidth = 550
let mainWindowHeight = 440
//#endregion

//#region Menu
const template = [
  {
    label: 'Игра',
    submenu: [
      { label: 'Новая игра...', click() {openNewGameWindow();} },
      //{ label: 'Перезагрузить', role: 'reload' },
      isMac ? { label: 'Выход', role: 'close' } : { label: 'Выход', role: 'quit' }
    ]
  },
  {
    label: 'Пакет',
    submenu: [
      { label: 'Вставить из буфера обмена', click() { pastePackageFromClipboard(); } },
      { label: 'Показать/Скрыть вопросы', type: 'checkbox', checked: false, 
                click() { toggleShowPackage() }},
      { label: 'Копировать подробный счёт', type: 'checkbox', checked: false, 
      click() { toggleDetailedScores() }}
    ]
  },
  {
    label: 'Итоги',
    submenu: [
      { label: 'Показать график', click() { openGraphWindow(); } }
    ]
  },
  {
    label: 'Вид',
    submenu: [
      { label: 'Сбросить масштаб', role: 'resetzoom' },
      { label: 'Увеличить', role: 'zoomin' },
      { label: 'Уменьшить', role: 'zoomout' },
      { type: 'separator' },
      { label: 'Полноэкранный режим', role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Помощь', role: 'help',
    submenu: [
      {
        label: 'Сайт программы',
        click: async () => {
          const { shell } = require('electron')
          await shell.openExternal('https://github.com/eXConf/sigma-x')
        }
      },
      {
        label: 'О программе...', click() { openAboutDialog(); }
      }
    ]
  }
]
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
//#endregion

//#region Menu functions
function pastePackageFromClipboard() {
  let text = clipboard.readText()
  mainWindow.webContents.send('pack-from-clipboard', text)
  menu.items[1].submenu.items[1].checked = true
}

function toggleShowPackage() {
  mainWindow.webContents.send("toggle-show-package")
}

function toggleDetailedScores() {
  mainWindow.webContents.send("toggle-detailed-scores")
}

function openAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    buttons: [],
    title: 'О программе...',
    message: 'SIGMA X:\nSvoya Igra Game Manager Application by eXconf \n\n' +
    'Версия: ' + app.getVersion() + '\nАвтор: Сергей Соседкин'
  })
}

function openNewGameWindow() {
  newGameWindow = new BrowserWindow({
    width: 400, height: 300, minWidth: 400, minHeight: 300,
    webPreferences: { nodeIntegration: true },
    title: "SIGMA X — Новая игра"
  })
  
  //Remove menu for production!
  newGameWindow.removeMenu()
  newGameWindow.loadFile('./html/new-game.html')
  //newGameWindow.webContents.openDevTools()

  newGameWindow.on('closed',  () => {
    newGameWindow = null
  })
}

function openGraphWindow() {
  graphWindow = new BrowserWindow({
    width: 900, height: 560, minWidth: 400, minHeight: 300,
    webPreferences: { nodeIntegration: true },
    title: "SIGMA X — График игры"
  })

  //Remove menu for production!
  graphWindow.removeMenu()
  graphWindow.loadFile('./html/graph.html')
  //graphWindow.webContents.openDevTools()

  graphWindow.on('closed',  () => {
    graphWindow = null
  })

  mainWindow.webContents.send("graph-id", graphWindow.webContents.id)
}
//#endregion

// Create a new BrowserWindow when `app` is ready
function createWindow () {
  setTimeout(() => {
    autoUpdater.checkForUpdates()
  }, 2000)
  mainWindow = new BrowserWindow({
    // width: 485, height: 800,
    width: mainWindowWidth, height: mainWindowHeight,
    minWidth: 490, minHeight: 450,
    x: 200, y: 50,
    webPreferences: { nodeIntegration: true },
    title: "SIGMA X"
  })

  // Load index.html into the new BrowserWindow
  mainWindow.loadFile('./html/index.html')

  // Open DevTools - Remove for PRODUCTION!
  //mainWindow.webContents.openDevTools()

  // Hide menu
  //mainWindow.removeMenu()

  // Listen for window being closed
  mainWindow.on('closed',  () => {
    mainWindow = null
  })
}

//#region App options
app.allowRendererProcessReuse = false

// Electron `app` is ready
app.on('ready', createWindow)

// Quit when all windows are closed - (Not macOS - Darwin)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// When app icon is clicked and app is running, (macOS) recreate the BrowserWindow
app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
//#endregion

//#region IPC
ipcMain.on("resize-main-window", (e, params) => {
  mainWindow.setSize(params.width + 80, params.height + 50)
})

ipcMain.on("new-game-clicked", (e, params) => {
  mainWindow.webContents.send("new-game-clicked", params)
  newGameWindow.close()
})
//#endregion

//#region AutoUpdater
autoUpdater.on("update-available", () => {
    dialog.showMessageBox({
        type: "info",
        title: "Доступно обновление",
        message: "Доступна новая версия SIGMA X. Хотите обновить программу сейчас?",
        buttons: ["Обновить", "Позже"],
        defaultId: 0,
        cancelId: 1
    }).then(result => {
        //Если кнопка 0 (Обновить), начинаем загрузку обновления
        if (result.response === 0) {
          // Начинаем загрузку  
          autoUpdater.downloadUpdate()
          
          // Создаем окно со статусом загрузки
          createDlStatusWindow()
        }
    })
})

autoUpdater.on("update-downloaded", () => {
  // Закрываем окно со статусом загрузки
  dlStatusWindow.close()
  dialog.showMessageBox({
        type: "info",
        title: "Обновление готово",
        message: "Обновление загружено. Перезапустить программу и установить обновление сейчас?",
        buttons: ["Да", "Позже"]
    }).then(result => {
        //Если кнопка 0 (Установить), закрываем программу и устанавливаем обновление
        if (result.response == 0) { autoUpdater.quitAndInstall(false, true) }
    })
})

autoUpdater.on("download-progress", (progress) => {
  dlStatusWindow.webContents.send("dl-status", Math.floor(progress.percent))

})

function createDlStatusWindow() {
  dlStatusWindow = new BrowserWindow({
    width: 350, height: 90, minWidth: 350, minHeight: 100,
    webPreferences: { nodeIntegration: true },
    title: "Загрузка обновления..."
  })
  dlStatusWindow.removeMenu()
  dlStatusWindow.loadFile('./html/dl-status.html')
  dlStatusWindow.on('closed',  () => {
    dlStatusWindow = null
  })
}
//#endregion