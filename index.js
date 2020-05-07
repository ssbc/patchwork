process.on('uncaughtException', function (err) {
  console.log(err)
  process.exit()
})

const electron = require('electron')
const openWindow = require('./lib/window')

const Path = require('path')
const defaultMenu = require('electron-default-menu')
const WindowState = require('electron-window-state')
const Menu = electron.Menu
const extend = require('xtend')
const ssbKeys = require('ssb-keys')

const windows = {
  dialogs: new Set()
}
let ssbConfig = null
let quitting = false

/**
 * It's not possible to run two instances of patchwork as it would create two
 * ssb-server instances that conflict on the same port. Before opening patchwork,
 * we check if it's already running and if it is we focus the existing window
 * rather than opening a new instance.
 */
function quitIfAlreadyRunning () {
  if (!electron.app.requestSingleInstanceLock()) {
    console.log('Patchwork is already running!')
    console.log('Please close the existing instance before starting a new one.')
    return electron.app.quit()
  }
  electron.app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (windows.main) {
      if (windows.main.isMinimized()) windows.main.restore()
      windows.main.focus()
    }
  })
}

const config = {
  server: !(process.argv.includes('-g') || process.argv.includes('--use-global-ssb'))
}
// a flag so we don't start git-ssb-web if a custom path is passed in
if (process.argv.includes('--path')) {
  config.customPath = true
}

quitIfAlreadyRunning()

electron.app.on('ready', () => {
  setupContext(process.env.ssb_appname || 'ssb', {
    server: !(process.argv.includes('-g') || process.argv.includes('--use-global-ssb'))
  }, () => {
    const browserWindow = openMainWindow()

    browserWindow.on('app-command', (e, cmd) => {
      switch (cmd) {
        case 'browser-backward': {
          browserWindow.webContents.send('goBack')
          break
        }
        case 'browser-forward': {
          browserWindow.webContents.send('goForward')
          break
        }
      }
    })

    const menu = defaultMenu(electron.app, electron.shell)

    menu.splice(4, 0, {
      label: 'Navigation',
      submenu: [
        {
          label: 'Activate Search Field',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            browserWindow.webContents.send('activateSearch')
          }
        },
        {
          label: 'Back',
          accelerator: 'CmdOrCtrl+[',
          click: () => {
            browserWindow.webContents.send('goBack')
          }
        },
        {
          label: 'Forward',
          accelerator: 'CmdOrCtrl+]',
          click: () => {
            browserWindow.webContents.send('goForward')
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            browserWindow.webContents.send('goToSettings')
          }
        }
      ]
    })

    const view = menu.find(x => x.label === 'View')
    view.submenu = [
      { role: 'reload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin', accelerator: 'CmdOrCtrl+=' },
      { role: 'zoomout', accelerator: 'CmdOrCtrl+-' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
    const help = menu.find(x => x.label === 'Help')
    help.submenu = [
      {
        label: 'Learn More',
        click () { require('electron').shell.openExternal('https://scuttlebutt.nz') }
      }
    ]
    if (process.platform === 'darwin') {
      const win = menu.find(x => x.label === 'Window')
      win.submenu = [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close', label: 'Close' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate(menu))
  })

  electron.app.on('activate', function () {
    if (windows.main) {
      windows.main.show()
    }
  })

  electron.app.on('before-quit', function () {
    quitting = true
  })

  electron.ipcMain.on('open-background-devtools', function () {
    if (windows.background) {
      windows.background.webContents.openDevTools({ mode: 'detach' })
    }
  })
})

function openMainWindow () {
  if (!windows.main) {
    const windowState = WindowState({
      defaultWidth: 1024,
      defaultHeight: 768
    })
    windows.main = openWindow(ssbConfig, Path.join(__dirname, 'lib', 'main-window.js'), {
      minWidth: 800,
      x: windowState.x,
      y: windowState.y,
      width: windowState.width,
      height: windowState.height,
      titleBarStyle: 'hiddenInset',
      autoHideMenuBar: true,
      title: 'Patchwork',
      show: true,
      backgroundColor: '#EEE',
      icon: Path.join(__dirname, 'assets/icon.png')
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
  return windows.main
}

function setupContext (appName, opts, cb) {
  ssbConfig = require('ssb-config/inject')(appName, extend({
    port: 8008,
    blobsPort: 8989, // matches ssb-ws
    friends: { // not using ssb-friends (sbot/contacts fixes hops at 2, so this setting won't do anything)
      dunbar: 150,
      hops: 2 // down from 3
    }
  }, opts))

  // disable gossip auto-population from {type: 'pub'} messages as we handle this manually in sbot/index.js
  if (!ssbConfig.gossip) ssbConfig.gossip = {}
  ssbConfig.gossip.autoPopulate = false

  ssbConfig.keys = ssbKeys.loadOrCreateSync(Path.join(ssbConfig.path, 'secret'))

  const keys = ssbConfig.keys
  const pubkey = keys.id.slice(1).replace(`.${keys.curve}`, '')

  if (process.platform === 'win32') {
    // fix offline on windows by specifying 127.0.0.1 instead of localhost (default)
    ssbConfig.remote = `net:127.0.0.1:${ssbConfig.port}~shs:${pubkey}`
  } else {
    const socketPath = Path.join(ssbConfig.path, 'socket')
    ssbConfig.connections.incoming.unix = [{ scope: 'device', transform: 'noauth' }]
    ssbConfig.remote = `unix:${socketPath}:~noauth:${pubkey}`
  }

  // Support rooms
  ssbConfig.connections.incoming.tunnel = [{ scope: 'public', transform: 'shs' }]
  ssbConfig.connections.outgoing.tunnel = [{ transform: 'shs' }]

  // Support DHT invites (only as a client, for now)
  ssbConfig.connections.outgoing.dht = [{ transform: 'shs' }]

  const redactedConfig = JSON.parse(JSON.stringify(ssbConfig))
  redactedConfig.keys.private = null
  console.dir(redactedConfig, { depth: null })

  if (opts.server === false) {
    cb && cb()
  } else {
    electron.ipcMain.once('server-started', function (ev, config) {
      ssbConfig = config
      cb && cb()
    })
    windows.background = openWindow(ssbConfig, Path.join(__dirname, 'lib', 'server-process.js'), {
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
    // windows.background.on('close', (ev) => {
    //   ev.preventDefault()
    //   windows.background.hide()
    // })
  }
}
