var Menu = require('menu')
var dialog = require('dialog')

module.exports = function (window) {
  var template = [
    {
      label: 'Patchwork',
      submenu: [
        {
          label: 'About Patchwork',
          selector: 'orderFrontStandardAboutPanel:'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          selector: 'terminate:'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'Command+Z',
          selector: 'undo:'
        },
        {
          label: 'Redo',
          accelerator: 'Shift+Command+Z',
          selector: 'redo:'
        },
        {
          type: 'separator'
        },
        {
          label: 'Cut',
          accelerator: 'Command+X',
          selector: 'cut:'
        },
        {
          label: 'Copy',
          accelerator: 'Command+C',
          selector: 'copy:'
        },
        {
          label: 'Paste',
          accelerator: 'Command+V',
          selector: 'paste:'
        },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:'
        },
        {
          type: 'separator'
        },
        {
          label: 'Find',
          accelerator: 'Command+F',
          click: function () {
            window.rpc.triggerFind()
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: function() { 
            window.resetRpc()
            window.reload()
          }
        },
        {
          label: 'Toggle DevTools',
          accelerator: 'Alt+Command+I',
          click: function() { 
            window.toggleDevTools()
            // window.rpc.contextualToggleDevTools()
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Data Log',
          click: function () {
            window.rpc.navigate('/data')
          }
        },
        {
          label: 'Network Status',
          click: function () {
            window.rpc.navigate('/sync')
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:'
        },
        {
          label: 'Close',
          accelerator: 'Command+W',
          selector: 'performClose:'
        },
        {
          type: 'separator'
        },
        {
          label: 'Bring All to Front',
          selector: 'arrangeInFront:'
        }
      ]
    }
  ]

  menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}