var Menu = require('electron').Menu
var dialog = require('electron').dialog
var pkg = require('../package')
var windows = require('./windows')
var path = require('path')
var t = require('patchwork-translations')

var isMac = (process.platform == 'darwin')

function showAbout(win) {
  dialog.showMessageBox(win, {
    title: t('AboutPatchwork'),
    buttons: [t('Close'), t('License')],
    type: 'info',
    icon: path.join(__dirname, '../ui/img/icon.png'),
    message: pkg.name + ' v' + pkg.version,
    detail: pkg.description + '\n\n' +
      t('Copyright', {years: '2016-2016'}) + '\n\n' +
      'http://ssbc.github.io/patchwork/'
  }, function (btn) {
    if (btn == 1)
      showLicense(win)
  })
}

function showLicense(win) {
  dialog.showMessageBox(win, {
    title: t('License'),
    buttons: [t('Close')],
    message: pkg.license,
    detail: t('LicenseDialog')
  })
}

module.exports = function (configOracle) {
  var template = [
    {
      label: t('Patchwork'),
      submenu: [
        {
          label: t('AboutPatchwork'),
          role: 'about',
          click: function (item, win) {
            showAbout(win)
          }
        },
      ].concat(isMac ? [
        {
          type: 'separator'
        },
        {
          label: t('macApp.HidePatchwork'),
          accelerator: 'Command+H',
          selector: 'hide:',
          role: 'hide'
        },
        {
          label: t('macApp.HideOthers'),
          accelerator: 'Option+Command+H',
          selector: 'hideOtherApplications:',
        role: 'hideothers'
        },
        {
          label: t('macApp.ShowAll'),
          selector: 'unhideAllApplications:',
          role: 'unhide'
        },
      ] : [], [
        {
          type: 'separator'
        },
        {
          label: t('Quit'),
          accelerator: 'CmdOrCtrl+Q',
          click: function (item, win) {
            require('electron').app.quit()
          }
        }
      ])
    },
    {
      label: t('Edit'),
      submenu: [
        {
          label: t('Undo'),
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: t('Redo'),
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          label: t('Cut'),
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: t('Copy'),
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: t('Paste'),
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: t('SelectAll'),
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
        {
          type: 'separator'
        },
        {
          label: t('Find2'),
          accelerator: 'CmdOrCtrl+F',
          click: function (item, win) {
            win.webContents.executeJavaScript('app.emit("focus:find")')
          }
        },
        {
          label: t('FindNext'),
          accelerator: 'CmdOrCtrl+G',
          click: function (item, win) {
            win.webContents.executeJavaScript('app.emit("find:next")')
          }
        },
        {
          label: t('FindPrevious'),
          accelerator: 'CmdOrCtrl+Shift+G',
          click: function (item, win) {
            win.webContents.executeJavaScript('app.emit("find:previous")')
          }
        }
      ]
    },
    {
      label: t('View'),
      submenu: [
        {
          label: t('ZoomIn'),
          accelerator: 'CmdOrCtrl+=',
          click: function (item, win) {
            win.webContents.executeJavaScript('window.zoom.zoomIn()')
          }
        },
        {
          label: t('ZoomOut'),
          accelerator: 'CmdOrCtrl+-',
          click: function (item, win) {
            win.webContents.executeJavaScript('window.zoom.zoomOut()')
          }
        },
        {
          label: t('NormalSize'),
          accelerator: 'CmdOrCtrl+0',
          click: function (item, win) {
            win.webContents.executeJavaScript('window.zoom.zoomReset()')
          }
        },
        {
          type: 'separator'
        },
        {
          label: t('ToggleDevTools'),
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: function (item, win) { 
            win.toggleDevTools()
          }
        }
      ]
    },
    {
      label: t('Go'),
      submenu: [
        {
          label: t('Back'),
          accelerator: 'Alt+Left',
          click: function (item, win) {
            win.webContents.goBack()
          }
        },
        {
          label: t('Forward'),
          accelerator: 'Alt+Right',
          click: function (item, win) {
            win.webContents.goForward()
          }
        },
        {
          label: t('Reload'),
          accelerator: 'CmdOrCtrl+R',
          click: function (item, win) {
            win.reload()
          }
        },
        {
          type: 'separator'
        },

        {
          label: t('Inbox'),
          accelerator: 'CmdOrCtrl+1',
          click: function (item, win) {
            win.webContents.executeJavaScript('app.history.pushState(null, "")')
          }
        },
        {
          label: t('ActivityFeed'),
          accelerator: 'CmdOrCtrl+2',
          click: function (item, win) {
            win.webContents.executeJavaScript('app.history.pushState(null, "activity")')
          }
        },
        {
          label: t('Contacts'),
          accelerator: 'CmdOrCtrl+3',
          click: function (item, win) {
            win.webContents.executeJavaScript('app.history.pushState(null, "contacts")')
          }
        },

        {
          type: 'separator'
        },

        {
          label: 'NoticesMenuItem',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: function (item, win) {
            win.webContents.executeJavaScript('app.history.pushState(null, "notices")')
          }
        },
        {
          label: t('YourProfile'),
          accelerator: 'CmdOrCtrl+Shift+P',
          click: function (item, win) {
            win.webContents.executeJavaScript('app.history.pushState(null, "profile/" + encodeURIComponent(app.user.id))')
          }
        },

        {
          label: t('NetworkSync'),
          accelerator: 'CmdOrCtrl+4',
          click: function (item, win) {
            win.webContents.executeJavaScript('app.history.pushState(null, "sync")')
          }
        },
        {
          label: t('DataFeed'),
          accelerator: 'CmdOrCtrl+5',
          click: function (item, win) {
            win.webContents.executeJavaScript('app.history.pushState(null, "data")')
          }
        },

        {
          type: 'separator'
        },
        {
          label: t('Search'),
          accelerator: 'CmdOrCtrl+K',
          click: function (item, win) {
            win.webContents.executeJavaScript('app.emit("focus:search")')
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: t('NewWindow'),
          accelerator: 'CmdOrCtrl+N',
          click: function (item, win) {
            var newWindow = windows.create()
            newWindow.loadURL(configOracle.getLocalUrl())
          }
        },
        {
          label: t('Close'),
          accelerator: 'CmdOrCtrl+W',
          click: function (item, win) {
            win.close()
          }
        },
      ].concat(isMac ? [
        {
          label: t('Minimize'),
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          type: 'separator'
        },
        {
          label: t('macApp.BringAllToFront'),
          selector: 'arrangeInFront:',
          role: 'front'
        }
      ] : [])
    }
  ]

  menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}