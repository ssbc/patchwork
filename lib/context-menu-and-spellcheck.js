var electron = require('electron')
var {SpellCheckHandler, ContextMenuListener, ContextMenuBuilder} = require('electron-spellchecker')
var MenuItem = electron.remote.MenuItem

window.spellCheckHandler = new SpellCheckHandler()
window.spellCheckHandler.attachToInput()

// Start off as US English, America #1 (lol)
window.spellCheckHandler.switchLanguage('en-US')

var contextMenuBuilder = new ContextMenuBuilder(window.spellCheckHandler, null, true)
module.exports = new ContextMenuListener((info) => {
  contextMenuBuilder.buildMenuForElement(info).then((menu) => {
    var element = document.elementFromPoint(info.x, info.y)
    while (element && !element.msg) {
      element = element.parentNode
    }

    menu.append(new MenuItem({
      label: 'Inspect Server Process',
      click: function () {
        electron.ipcRenderer.send('open-background-devtools')
      }
    }))

    menu.append(new MenuItem({
      type: 'separator'
    }))

    menu.append(new MenuItem({
      label: 'Reload',
      click: function (item, focusedWindow) {
        if (focusedWindow) {
          focusedWindow.reload()
        }
      }
    }))

    if (element && element.msg) {
      menu.append(new MenuItem({
        type: 'separator'
      }))
      menu.append(new MenuItem({
        label: 'Copy Message ID',
        click: function () {
          electron.clipboard.writeText(element.msg.key)
        }
      }))
    }
    menu.popup(electron.remote.getCurrentWindow())
  }).catch((err) => {
    throw err
  })
})
