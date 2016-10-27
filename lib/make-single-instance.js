var electron = require('electron')
module.exports = function (windows, openMainWindow) {
  if (electron.app.makeSingleInstance((commandLine, workingDirectory) => {
    if (windows.main) {
      if (windows.main.isMinimized()) windows.main.restore()
      windows.main.focus()
    } else {
      openMainWindow()
    }
  })) {
    electron.app.quit()
  }
}
