

// REPLACEME



var remote = require('remote')
var Menu = remote.require('menu')
var MenuItem = remote.require('menu-item')
var dialog = remote.require('dialog')
var clipboard = require('clipboard')
var ssbref = require('ssb-ref')
var fs = remote.require('fs')
var http = remote.require('http')

/* using globals because putting properties on the menu didn't seem to work */
var currentEl
var currentLink

var imgMenuItems = [
  {
    label: 'Save Image As',
    click: function (item, mainWindow) {
      var img = currentEl
      var name = img.alt || img.src
      var m = /^http:\/\/localhost:7777\/.*\&name=([^&]*)/.exec(img.src)
      if (m)
        name = m[1]

      dialog.showSaveDialog({
        defaultPath: name
      }, function (fileName) {
        if (fileName) {
          http.request(img.src, function (res) {
            res.pipe(fs.createWriteStream(fileName))
          }).end()
        }
      })
    }
  },
  /*
  {
    label: 'Copy Image',
    click: function () { }
  },
  */
  {
    label: 'Copy Image Location',
    click: function (item) {
      var link = currentEl.src
      var m = /^http:\/\/localhost:7777\/([^?]*)/.exec(link)
      if (m && ssbref.isLink(m[1]))
        link = m[1]
      clipboard.writeText(link)
    }
  }
]

var linkMenuItems = [
  {
    label: 'Open Link',
    click: function (item) {
      currentLink.click()
    }
  },
  {
    label: 'Copy Link Location',
    click: function () {
      var href = currentLink.getAttribute('href')
      var m = /^#\/[^\/]*\/(.*)/.exec(href)
      if (m) {
        var link = decodeURIComponent(m[1])
        if (ssbref.isLink(link))
          href = link
      }
      clipboard.writeText(href)
    }
  },
]

var textSelectionMenuItems = [
  {label: 'Copy', role: 'copy'}
]

var texteditMenuItems = [
  {label: 'Cut', role: 'cut'},
  {label: 'Copy', role: 'copy'},
  {label: 'Paste', role: 'paste'},
  {label: 'Delete', click: function (item) {
    document.execCommand('delete')
  }},
  {type: 'separator'},
  {label: 'Select All', role: 'selectall'},
]

var texteditMenuItemsNoSelection = [
  {label: 'Cut', role: 'cut', enabled: false},
  {label: 'Copy', role: 'copy', enabled: false},
  {label: 'Paste', role: 'paste'},
  {label: 'Delete', enabled: false},
  {type: 'separator'},
  {label: 'Select All', role: 'selectall'},
]

function appendMenuItemGroup(menu, items) {
  if (menu.items.length) {
    menu.append(new MenuItem({
      type: 'separator'
    }))
  }
  for (var i = 0; i < items.length; i++) {
    menu.append(new MenuItem(items[i]))
  }
}

function getContainingLink(el) {
  while (el) {
    if (el.nodeName == 'A' && el.href)
      return el
    el = el.parentNode
  }
}

function createMenu(el) {
  var menu = new Menu()
  var link = getContainingLink(el)
  currentEl = el

  switch (el.nodeName) {
    case 'IMG':
      appendMenuItemGroup(menu, imgMenuItems)
      break
    case 'INPUT':
    case 'TEXTAREA':
      if (el.selectionEnd == el.selectionStart)
        appendMenuItemGroup(menu, texteditMenuItemsNoSelection)
      else
        appendMenuItemGroup(menu, texteditMenuItems)
      break
    default:
      if (!link && document.getSelection().type == 'Range')
        appendMenuItemGroup(menu, textSelectionMenuItems)
      break
  }

  if (link) {
    currentLink = link
    appendMenuItemGroup(menu, linkMenuItems)
  }

  return menu
}

module.exports = function onContextMenu(e) {
  e.preventDefault()
  var menu = createMenu(e.target)
  if (menu)
    menu.popup(remote.getCurrentWindow())
}
