const electron = require('electron')
const { Value } = require('mutant')

module.exports = function () {
  const win = electron.remote.getCurrentWindow()
  const isFullScreen = Value(win.isFullScreen())
  win.on('enter-full-screen', () => {
    isFullScreen.set(true)
  })
  win.on('leave-full-screen', () => {
    isFullScreen.set(false)
  })
  return isFullScreen
}
