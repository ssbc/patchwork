var {remote, shell, clipboard, ipcRenderer} = require('electron')
var {SpellCheckHandler, ContextMenuListener, ContextMenuBuilder} = require('electron-spellchecker')
var {MenuItem, Menu} = remote

window.spellCheckHandler = new SpellCheckHandler()
window.spellCheckHandler.attachToInput()

// Start off as US English, America #1 (lol)
window.spellCheckHandler.switchLanguage('en-US')

var contextMenuBuilder = new ContextMenuBuilder(window.spellCheckHandler, null, true)

contextMenuBuilder.buildMenuForLink = function (menuInfo) {
  var menu = new Menu()
  var isEmailAddress = menuInfo.linkURL.startsWith('mailto:')
  var isFile = menuInfo.linkURL.startsWith('file:')

  if (!isFile) {
    var copyLink = new MenuItem({
      label: isEmailAddress ? this.stringTable.copyMail() : this.stringTable.copyLinkUrl(),
      click: () => {
        // Omit the mailto: portion of the link; we just want the address
        clipboard.writeText(isEmailAddress ? menuInfo.linkText : menuInfo.linkURL)
      }
    })

    var openLink = new MenuItem({
      label: this.stringTable.openLinkUrl(),
      click: () => {
        shell.openExternal(menuInfo.linkURL)
      }
    })

    menu.append(copyLink)
    menu.append(openLink)
  }

  if (this.isSrcUrlValid(menuInfo)) {
    if (!isFile) this.addSeparator(menu)
    this.addImageItems(menu, menuInfo)
  }

  this.addInspectElement(menu, menuInfo)
  this.processMenu(menu, menuInfo)

  return menu
}

module.exports = new ContextMenuListener((info) => {
  contextMenuBuilder.buildMenuForElement(info).then((menu) => {
    var element = document.elementFromPoint(info.x, info.y)
    while (element && !element.msg) {
      element = element.parentNode
    }

    menu.append(new MenuItem({
      label: 'Inspect Server Process',
      click: function () {
        ipcRenderer.send('open-background-devtools')
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
          clipboard.writeText(element.msg.key)
        }
      }))
    }
    menu.popup(remote.getCurrentWindow())
  }).catch((err) => {
    throw err
  })
})
