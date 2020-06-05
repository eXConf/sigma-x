// Modules
const {app, dialog, Menu, BrowserWindow, clipboard, ipcMain} = require('electron')
const isMac = process.platform === 'darwin'

//#region Window(s)
let mainWindow
let newGameWindow
let graphWindow

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
                click() { toggleShowPackage() }}
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
          await shell.openExternal('https://github.com/eXConf?tab=repositories')
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
  newGameWindow.loadFile('new-game.html')
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
  graphWindow.loadFile('graph.html')
  graphWindow.webContents.openDevTools()

  graphWindow.on('closed',  () => {
    graphWindow = null
  })

  mainWindow.webContents.send("graph-id", graphWindow.webContents.id)
}
//#endregion

// Create a new BrowserWindow when `app` is ready
function createWindow () {

  mainWindow = new BrowserWindow({
    // width: 485, height: 800,
    width: mainWindowWidth, height: mainWindowHeight,
    minWidth: 490, minHeight: 450,
    x: 200, y: 50,
    webPreferences: { nodeIntegration: true },
    title: "SIGMA X"
  })

  // Load index.html into the new BrowserWindow
  mainWindow.loadFile('index.html')

  // Open DevTools - Remove for PRODUCTION!
  mainWindow.webContents.openDevTools()

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
ipcMain.on("resize-main-window", (e, height) => {
  mainWindow.setSize(mainWindowWidth, mainWindowHeight + height + 10)
})

ipcMain.on("new-game-clicked", (e, params) => {
  mainWindow.webContents.send("new-game-clicked", params)
  newGameWindow.close()
})
//#endregion