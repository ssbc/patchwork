process.on('uncaughtException', function (err) {
  console.log(err)
  process.exit()
})

var electron = require('electron')
var openWindow = require('./lib/window')

var Path = require('path')
var defaultMenu = require('electron-default-menu')
var Menu = electron.Menu
var extend = require('xtend')
var ssbKeys = require('ssb-keys')

var windows = {
  dialogs: new Set()
}

var ssbConfig = null

electron.app.on('ready', () => {
  setupContext('ssb', {
    server: !(process.argv.includes('-g') || process.argv.includes('--use-global-ssb'))
  }, () => {
    Menu.setApplicationMenu(Menu.buildFromTemplate(defaultMenu(electron.app, electron.shell)))
    openMainWindow()
  })

  electron.app.on('activate', function (e) {
    openMainWindow()
  })

  electron.ipcMain.on('open-background-devtools', function (ev, config) {
    if (windows.background) {
      windows.background.webContents.openDevTools({detach: true})
    }
  })
})

function openMainWindow () {
  if (!windows.main) {
    windows.main = openWindow(ssbConfig, Path.join(__dirname, 'main-window.js'), {
      minWidth: 800,
      width: 1024,
      height: 768,
      titleBarStyle: 'hidden-inset',
      title: 'Patchwork',
      show: true,
      backgroundColor: '#EEE',
      webPreferences: {
        experimentalFeatures: true
      },
      icon: './ferment-logo.png'
    })
    windows.main.setSheetOffset(40)
    windows.main.on('closed', function () {
      windows.main = null
    })
  }
}

function setupContext (appName, opts, cb) {
  ssbConfig = require('ssb-config/inject')(appName, extend({
    port: 8008,
    blobsPort: 7777
  }, opts))

  ssbConfig.keys = ssbKeys.loadOrCreateSync(Path.join(ssbConfig.path, 'secret'))

  if (opts.server === false) {
    cb && cb()
  } else {
    electron.ipcMain.once('server-started', function (ev, config) {
      ssbConfig = config
      cb && cb()
    })
    windows.background = openWindow(ssbConfig, Path.join(__dirname, 'server-process.js'), {
      connect: false,
      center: true,
      fullscreen: false,
      fullscreenable: false,
      height: 150,
      maximizable: false,
      minimizable: false,
      resizable: false,
      show: false,
      skipTaskbar: true,
      title: 'patchwork-server',
      useContentSize: true,
      width: 150
    })
    windows.background.on('close', (ev) => {
      ev.preventDefault()
      windows.background.hide()
    })
  }
}
