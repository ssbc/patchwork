var {remote, shell, clipboard, ipcRenderer} = require('electron')
var {SpellCheckHandler, ContextMenuListener, ContextMenuBuilder} = require('electron-spellchecker')
var {MenuItem, Menu} = remote
var ref = require('ssb-ref')

module.exports = setupContextMenuAndSpellCheck

function setupContextMenuAndSpellCheck (config) {
  window.spellCheckHandler = new SpellCheckHandler()
  window.spellCheckHandler.attachToInput()

  // Start off as US English, America #1 (lol)
  window.spellCheckHandler.switchLanguage('en-US')

  var contextMenuBuilder = new ContextMenuBuilder(window.spellCheckHandler, null, true)

  contextMenuBuilder.buildMenuForLink = function (menuInfo) {
    var menu = new Menu()
    var isEmailAddress = menuInfo.linkURL.startsWith('mailto:')
    var isFile = menuInfo.linkURL.startsWith('file:')
    var extractedRef = ref.extract(menuInfo.linkURL)

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

    if (extractedRef) {
      var copyRef = new MenuItem({
        label: `Copy Link Ref (${extractedRef.slice(0, 10)}...)`,
        click: () => {
          // Omit the mailto: portion of the link; we just want the address
          clipboard.writeText(extractedRef)
        }
      })
      menu.append(copyRef)
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
        if (element.msg.value.content.text) {
          menu.append(new MenuItem({
            label: 'Copy Message Text',
            click: function () {
              clipboard.writeText(element.msg.value.content.text)
            }
          }))
        }
        menu.append(new MenuItem({
          label: 'Copy External Link',
          click: function () {
            const key = element.msg.key
            const gateway = config.gateway ||
              'https://viewer.scuttlebot.io'
            const url = `${gateway}/${encodeURIComponent(key)}`
            clipboard.writeText(url)
          }
        }))
      }
      menu.popup(remote.getCurrentWindow())
    }).catch((err) => {
      throw err
    })
  })
}
