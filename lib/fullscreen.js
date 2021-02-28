const electron = require('electron')
const { Value } = require('mutant')

module.exports = function () {
  const isFullScreen = Value(false)
  // receive the OS window state from the main process
  electron.ipcRenderer.on('enter-full-screen', () => {
    isFullScreen.set(true)
  })
  electron.ipcRenderer.on('leave-full-screen', () => {
    isFullScreen.set(false)
  })
  return isFullScreen
}
