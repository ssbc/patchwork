var remote = require('remote')
var Menu = remote.require('menu')
var MenuItem = remote.require('menu-item')
var dialog = remote.require('dialog')
var clipboard = require('clipboard')
var app = require('./lib/app')
var fs = remote.require('fs')
var http = remote.require('http')

/* using globals because putting properties on the menu didn't seem to work */
var currentEl
var currentLink

var imgMenuItems = [
  /*
  {
    label: 'Open Image in New Window',
    click: function () { }
  },
  */
  {
    label: 'Save Image As',
    click: function (item, mainWindow) {
      var img = currentEl
      dialog.showSaveDialog({
        defaultPath: img.src
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
      clipboard.writeText(currentEl.src)
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
  /*
  {
    label: 'Open Link in New Window',
    click: function () { }
  },
  {
    label: 'Download Linked Message',
    click: function () { }
  },
  */
  {
    label: 'Copy Link Location',
    click: function () {
      clipboard.writeText(currentLink.getAttribute('href'))
    }
  },
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
  currentEl = el

  if (el.nodeName == 'IMG') {
    appendMenuItemGroup(menu, imgMenuItems)
  }

  var link = getContainingLink(el)
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
