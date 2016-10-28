process.on('uncaughtException', function (err) {
  console.log(err)
  process.exit()
})

var electron = require('electron')
var openWindow = require('./lib/window')
var createSbot = require('./lib/ssb-server')
var serveBlobs = require('./lib/serve-blobs')
var makeSingleInstance = require('./lib/make-single-instance')
var pull = require('pull-stream')
var pullFile = require('pull-file')
var Path = require('path')
var fs = require('fs')
var defaultMenu = require('electron-default-menu')
var Menu = electron.Menu
var dataUriToBuffer = require('data-uri-to-buffer')
var extend = require('xtend')
var ssbKeys = require('ssb-keys')

var windows = {
  dialogs: new Set()
}

var context = null
if (process.argv.includes('--use-global-ssb') || process.argv.includes('-g')) {
  context = setupContext('ssb', {
    server: false
  })
} else {
  makeSingleInstance(windows, openMainWindow)
  context = setupContext('ssb')
}

electron.ipcMain.on('add-blob', (ev, id, path, cb) => {
  pull(
    path.startsWith('data:') ? pull.values([dataUriToBuffer(path)]) : pullFile(path),
    context.sbot.blobs.add((err, hash) => {
      if (err) return ev.sender.send('response', id, err)
      ev.sender.send('response', id, null, hash)
    })
  )
})

electron.app.on('ready', function () {
  Menu.setApplicationMenu(Menu.buildFromTemplate(defaultMenu(electron.app, electron.shell)))
  openMainWindow()
})

electron.app.on('activate', function (e) {
  openMainWindow()
})

function openMainWindow () {
  if (!windows.main) {
    windows.main = openWindow(context, Path.join(__dirname, 'main-window.js'), {
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

function setupContext (appName, opts) {
  var ssbConfig = require('ssb-config/inject')(appName, extend({
    port: 8008,
    blobsPort: 7777
  }, opts))

  if (opts && opts.server === false) {
    return {
      config: ssbConfig
    }
  } else {
    ssbConfig.keys = ssbKeys.loadOrCreateSync(Path.join(ssbConfig.path, 'secret'))
    var context = {
      sbot: createSbot(ssbConfig),
      config: ssbConfig
    }
    ssbConfig.manifest = context.sbot.getManifest()
    serveBlobs(context)
    fs.writeFileSync(Path.join(ssbConfig.path, 'manifest.json'), JSON.stringify(ssbConfig.manifest))
    console.log(`Address: ${context.sbot.getAddress()}`)
    return context
  }

  return ssbConfig
}
