const Path = require('path')
const electron = require('electron')
const extend = require('xtend/mutable')
const setupContextMenu = require('./context-menu')

module.exports = function Window (config, path, opts, serverDevToolsCallback, navigateHandler) {
  const window = new electron.BrowserWindow(extend({
    show: false,
    webPreferences: {
      nodeIntegration: true, // XXX: Maybe not always necessary (?)
      enableRemoteModule: true,
    }
  }, opts))

  // have to forward the OS window state to the renderer because it cannot
  // access directly
  window.on('enter-full-screen', (event, alwaysOnTop) => {
    window.webContents.send("enter-full-screen");
  })
  window.on('leave-full-screen', (event, alwaysOnTop) => {
    window.webContents.send("leave-full-screen");
  })
  electron.ipcMain.on('ready-to-show', handleReadyToShow)

  window.webContents.on('dom-ready', function () {
    window.webContents.send('window-setup', {
      rootPath: path,
      config: config,
      data: opts.data || '',
      title: opts.title || 'Patchwork',
    })
  })

  // setTimeout(function () {
  //   window.show()
  // }, 3000)

  window.webContents.on('will-navigate', function (e, url) {
    e.preventDefault()
    electron.shell.openExternal(url)
  })

  window.webContents.on('new-window', function (e, url) {
    e.preventDefault()
    electron.shell.openExternal(url)
  })

  window.on('closed', function () {
    electron.ipcMain.removeListener('ready-to-show', handleReadyToShow)
  })

  // TODO: better way to determine whether this is the main window ?
  if (opts.title === "Patchwork") {
    setupContextMenu(
      config,
      serverDevToolsCallback,
      navigateHandler,
      window
    );
  }

  window.loadURL('file://' + Path.join(__dirname, '..', 'assets', 'base.html'))
  return window

  // scoped

  function handleReadyToShow (ev) {
    if (ev.sender === window) {
      window.show()
      electron.ipcMain.removeListener('ready-to-show', handleReadyToShow)
    }
  }
}
