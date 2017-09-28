process.on('uncaughtException', function (err) {
  console.log(err)
  process.exit()
})

var electron = require('electron')
var openWindow = require('./lib/window')

var Path = require('path')
var defaultMenu = require('electron-default-menu')
var WindowState = require('electron-window-state')
var Menu = electron.Menu
var spawn = require('child_process').spawn

var windows = {
  dialogs: new Set()
}
var quitting = false

var ssbConfig = require('./config')

electron.app.on('ready', () => {
  startServer({
    server: false // !(process.argv.includes('-g') || process.argv.includes('--use-global-ssb'))
  }, () => {
    var menu = defaultMenu(electron.app, electron.shell)
    var view = menu.find(x => x.label === 'View')
    view.submenu = [
      { role: 'reload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
    if (process.platform === 'darwin') {
      var win = menu.find(x => x.label === 'Window')
      win.submenu = [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close', label: 'Close' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(menu))
    openMainWindow()
  })

  electron.app.on('activate', function (e) {
    if (windows.main) {
      windows.main.show()
    }
  })

  electron.app.on('before-quit', function () {
    quitting = true
  })

  electron.ipcMain.on('open-background-devtools', function (ev, config) {
    if (windows.background) {
      windows.background.webContents.openDevTools({detach: true})
    }
  })
})

function openMainWindow () {
  if (!windows.main) {
    var windowState = WindowState({
      defaultWidth: 1024,
      defaultHeight: 768
    })
    windows.main = openWindow(ssbConfig, Path.join(__dirname, 'main-window.js'), {
      minWidth: 800,
      x: windowState.x,
      y: windowState.y,
      width: windowState.width,
      height: windowState.height,
      titleBarStyle: 'hidden-inset',
      autoHideMenuBar: true,
      title: 'Patchwork',
      show: true,
      backgroundColor: '#EEE',
      webPreferences: {
        experimentalFeatures: true
      },
      icon: './assets/icon.png'
    })
    windowState.manage(windows.main)
    windows.main.setSheetOffset(40)
    windows.main.on('close', function (e) {
      if (!quitting && process.platform === 'darwin') {
        e.preventDefault()
        windows.main.hide()
      }
    })
    windows.main.on('closed', function () {
      windows.main = null
      if (process.platform !== 'darwin') electron.app.quit()
    })
  }
}

function startServer (opts, cb) {
  if (opts.server === false) {
    cb && cb()
  } else {
    setTimeout(() => {
      spawn('node', [Path.join(__dirname, 'server-process.js')], {
        stdio: 'inherit'
      })
    }, 200)
  }
}
