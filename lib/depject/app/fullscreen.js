const nest = require('depnest')
const electron = require('electron')
const { Value } = require('mutant')

exports.gives = nest('app.fullscreen')

exports.create = function () {
  return nest('app.fullscreen', function () {
    const win = electron.remote.getCurrentWindow()
    const isFullScreen = Value(win.isFullScreen())
    win.on('enter-full-screen', function () {
      isFullScreen.set(true)
    })
    win.on('leave-full-screen', function () {
      isFullScreen.set(false)
    })
    return isFullScreen
  })
}
