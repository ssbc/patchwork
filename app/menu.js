var Menu = require('menu')
var dialog = require('dialog')
var pkg = require('../package')

var isMac = (process.platform == 'darwin')

function showAbout(win) {
  dialog.showMessageBox(win, {
    title: 'About Patchwork',
    buttons: ['Close', 'License'],
    type: 'info',
    icon: 'assets/icon.png',
    message: pkg.name + ' v' + pkg.version,
    detail: pkg.description + '\n\n' +
      'Copyright © 2015-2016 Secure Scuttlebutt Consortium'
  }, function (btn) {
    if (btn == 1)
      showLicense(win)
  })
}

function showLicense(win) {
  dialog.showMessageBox(win, {
    title: 'License',
    buttons: ['Close'],
    message: pkg.license,
    detail: 'This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.\n\nThis program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.\n\nYou should have received a copy of the GNU General Public License along with this program. If not, see <http://www.gnu.org/licenses/>.'
  })
}

module.exports = function (window) {
  var template = [
    {
      label: 'Patchwork',
      submenu: [
        {
          label: 'About Patchwork',
          click: function (item, win) {
            showAbout(win)
          }
        },
      ].concat(isMac ? [
        {
          type: 'separator'
        },
        {
          label: 'Hide Patchwork',
          accelerator: 'Command+H',
          selector: 'hide:'
        },
        {
          label: 'Hide Others',
          accelerator: 'Option+Command+H',
          selector: 'hideOtherApplications:'
        },
        {
          label: 'Show All',
          selector: 'unhideAllApplications:'
        },
        {
          type: 'separator'
        },
      ] : [], [
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: function () {
            require('app').quit()
          }
        }
      ])
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
        {
          type: 'separator'
        },
        {
          label: 'Find...',
          accelerator: 'CmdOrCtrl+F',
          click: function () {
            window.rpc.triggerFind()
          }
        },
        {
          label: 'Find Previous',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: function () {
            window.rpc.findPrevious()
          }
        },
        {
          label: 'Find Next',
          accelerator: 'CmdOrCtrl+G',
          click: function () {
            window.rpc.findNext()
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: function () {
            window.rpc.zoomIn()
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: function () {
            window.rpc.zoomOut()
          }
        },
        {
          label: 'Normal Size',
          accelerator: 'CmdOrCtrl+0',
          click: function () {
            window.rpc.zoomReset()
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Toggle Bookmarks',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: function() {
            window.rpc.navigateToggle('bookmarks')
          }
        },
        {
          label: 'Toggle Notifications',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: function() {
            window.rpc.navigateToggle('notifications')
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Toggle DevTools',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: function() { 
            window.toggleDevTools()
            // window.rpc.contextualToggleDevTools()
          }
        }
      ]
    },
    {
      label: 'Go',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: function() {
            window.rpc.navigateHistory(-1)
          }
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: function() {
            window.rpc.navigateHistory(1)
          }
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: function() {
            window.resetRpc()
            window.reload()
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Feed',
          accelerator: 'CmdOrCtrl+1',
          click: function () {
            window.rpc.navigate('/')
          }
        },
        {
          label: 'Inbox',
          accelerator: 'CmdOrCtrl+2',
          click: function () {
            window.rpc.navigate('/inbox')
          }
        },
        {
          label: 'Contacts',
          accelerator: 'CmdOrCtrl+3',
          click: function () {
            window.rpc.navigate('/profile')
          }
        },
        {
          label: 'Network Status',
          accelerator: 'CmdOrCtrl+4',
          click: function () {
            window.rpc.navigate('/sync')
          }
        },
        {
          label: 'Data Log',
          accelerator: 'CmdOrCtrl+5',
          click: function () {
            window.rpc.navigate('/data')
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+K',
          click: function () {
            window.rpc.focusSearch()
          }
        }
      ]
    },
    isMac ? {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          type: 'separator'
        },
        {
          label: 'Bring All to Front',
          selector: 'arrangeInFront:'
        }
      ]
    } : {}
  ]

  menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
