const { remote, shell, clipboard, ipcRenderer } = require('electron')
const { SpellCheckHandler, ContextMenuListener, ContextMenuBuilder } = require('electron-spellchecker')
const { MenuItem, Menu } = remote
const ref = require('ssb-ref')

let navigateHandler = null
module.exports = setupContextMenuAndSpellCheck

function setupContextMenuAndSpellCheck (config, { navigate, getMessageText, language }) {
  navigateHandler = navigate
  const spellCheckHandler = new SpellCheckHandler()
  spellCheckHandler.attachToInput()

  // Start off as US English, America #1 (lol)
  spellCheckHandler.switchLanguage(language || 'en-US')

  const contextMenuBuilder = new ContextMenuBuilder(spellCheckHandler, null, true, (menu, menuInfo) => {
    const ddg = new MenuItem({
      label: 'Search With DuckDuckGo',
      click: () => {
        const url = `https://duckduckgo.com/?q=${encodeURIComponent(menuInfo.selectionText)}`
        shell.openExternal(url)
      }
    })

    // There's no menu.remove(id) so this is a convoluted way of removing the
    // 'Search with Google' menu item
    const oldItems = menu.items
    menu.clear()

    oldItems.forEach(oldItem => {
      if (oldItem.label === 'Search with Google') {
        menu.append(ddg)
      } else {
        menu.append(oldItem)
      }
    })

    if (menuInfo.mediaType !== 'none') {
      console.log(menuInfo)
      const copyEmbed = new MenuItem({
        label: 'Copy Embed Markdown',
        click: () => {
          // Omit the mailto: portion of the link; we just want the address
          const extractedRef = ref.extract(menuInfo.srcURL)
          clipboard.writeText(`![${menuInfo.titleText}](${extractedRef})`)
        }
      })
      menu.append(copyEmbed)
      const openImageInBrowser = new MenuItem({
        label: 'Open Image With Browser',
        click: () => {
          shell.openExternal(menuInfo.srcURL)
        }
      })
      menu.append(openImageInBrowser)
    }
  })

  contextMenuBuilder.buildMenuForLink = function (menuInfo) {
    const element = document.elementFromPoint(menuInfo.x, menuInfo.y)

    const menu = new Menu()
    const isEmailAddress = menuInfo.linkURL.startsWith('mailto:')
    const isFile = menuInfo.linkURL.startsWith('file:')

    // use the anchor of a link if it directly references an ID
    const extractedRef = element && ref.isLink(element.anchor) ? element.anchor : ref.extract(menuInfo.linkURL)

    if (!isFile) {
      const copyLink = new MenuItem({
        label: isEmailAddress ? this.stringTable.copyMail() : this.stringTable.copyLinkUrl(),
        click: () => {
          // Omit the mailto: portion of the link; we just want the address
          clipboard.writeText(isEmailAddress ? menuInfo.linkText : menuInfo.linkURL)
        }
      })

      const openLink = new MenuItem({
        label: this.stringTable.openLinkUrl(),
        click: () => {
          shell.openExternal(menuInfo.linkURL)
        }
      })

      menu.append(copyLink)
      menu.append(openLink)
    }

    if (extractedRef) {
      if (navigateHandler) {
        menu.append(new MenuItem({
          label: 'Find Link References',
          click: function () {
            navigateHandler('?' + extractedRef)
          }
        }))
        this.addSeparator(menu)
      }
      const copyRef = new MenuItem({
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

  module.exports.menu = new ContextMenuListener((info) => {
    contextMenuBuilder.buildMenuForElement(info).then((menu) => {
      let element = document.elementFromPoint(info.x, info.y)
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
        menu.append(new MenuItem({
          label: 'Copy Message Text',
          click: function () {
            getMessageText(element.msg.key, (err, value) => {
              if (!err) {
                clipboard.writeText(value)
              } else {
                showDialog({
                  type: 'error',
                  title: 'Error',
                  buttons: ['OK'],
                  message: 'Could not get message text.',
                  detail: err && err.message
                })
              }
            })
          }
        }))
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

function showDialog (opts) {
  remote.dialog.showMessageBox(remote.getCurrentWindow(), opts)
}
