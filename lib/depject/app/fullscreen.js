var nest = require('depnest')
var electron = require('electron')
var { Value } = require('mutant')

exports.gives = nest('app.fullscreen')

exports.create = function () {
  return nest('app.fullscreen', function () {
    var win = electron.remote.getCurrentWindow()
    var isFullScreen = Value(win.isFullScreen())
    win.on('enter-full-screen', function () {
      isFullScreen.set(true)
    })
    win.on('leave-full-screen', function () {
      isFullScreen.set(false)
    })
    return isFullScreen
  })
}
