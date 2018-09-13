var combine = require('depject')
var entry = require('depject/entry')
var electron = require('electron')
var h = require('mutant/h')
var when = require('mutant/when')
var onceTrue = require('mutant/once-true')
var computed = require('mutant/computed')
var catchLinks = require('./lib/catch-links')
var themes = require('./styles')
var nest = require('depnest')
var LatestUpdate = require('./lib/latest-update')
var ref = require('ssb-ref')
var setupContextMenuAndSpellCheck = require('./lib/context-menu-and-spellcheck')
var watch = require('mutant/watch')

module.exports = function (config) {
  var sockets = combine(
    overrideConfig(config),
    addCommand('app.navigate', navigate),
    require('./modules'),
    require('./plugs'),
    require('patch-settings'),
    require('patchcore'),
    require('./overrides')
  )

  var api = entry(sockets, nest({
    'config.sync.load': 'first',
    'keys.sync.id': 'first',
    'sbot.obs.connection': 'first',
    'sbot.async.get': 'first',
    'blob.sync.url': 'first',
    'page.html.render': 'first',
    'app.html.search': 'first',
    'app.html.channels': 'first',
    'app.views': 'first',
    'app.fullscreen': 'first',
    'app.sync.externalHandler': 'first',
    'app.html.progressNotifier': 'first',
    'profile.sheet.edit': 'first',
    'profile.html.preview': 'first',
    'app.navigate': 'first',
    'app.linkPreview': 'first',
    'channel.obs.subscribed': 'first',
    'settings.obs.get': 'first',
    'intl.sync.i18n': 'first'
  }))

  setupContextMenuAndSpellCheck(api.config.sync.load(), navigate)

  const i18n = api.intl.sync.i18n

  var id = api.keys.sync.id()
  var latestUpdate = LatestUpdate()
  var subscribedChannels = api.channel.obs.subscribed(id)

  // prompt to setup profile on first use
  onceTrue(api.sbot.obs.connection, (sbot) => {
    sbot.latestSequence(sbot.id, (_, key) => {
      if (key == null) {
        api.profile.sheet.edit()
      }
    })
  })

  var views = api.app.views(api.page.html.render, [
    '/public', '/private', id, '/mentions'
  ])

  var pendingCount = views.get('/mentions').pendingUpdates

  watch(pendingCount, count => {
    electron.remote.app.setBadgeCount(count)
  })

  electron.ipcRenderer.on('goForward', views.goForward)
  electron.ipcRenderer.on('goBack', views.goBack)

  document.head.appendChild(
    h('style', {
      innerHTML: computed(api.settings.obs.get('patchwork.theme', 'light'), themeName => {
        return themes[themeName] || themes['light']
      })
    })
  )

  document.head.appendChild(
    h('style', {
      innerHTML: computed(api.settings.obs.get('patchwork.fontSize'), size => {
        if (size) {
          return 'html, body {font-size: ' + size + ';}'
        }
      })
    })
  )

  var container = h(`MainWindow -${process.platform}`, {
    classList: [ when(api.app.fullscreen(), '-fullscreen') ]
  }, [
    h('div.top', [
      h('span.history', [
        h('a', {
          'ev-click': views.goBack,
          classList: [ when(views.canGoBack, '-active') ]
        }),
        h('a', {
          'ev-click': views.goForward,
          classList: [ when(views.canGoForward, '-active') ]
        })
      ]),
      h('span.nav', [
        tab(i18n('Public'), '/public'),
        tab(i18n('Private'), '/private'),
        dropTab(i18n('More'), [
          getSubscribedChannelMenu,
          [i18n('Gatherings'), '/gatherings'],
          [i18n('Tags'), `/tags/all/${encodeURIComponent(id)}`],
          [i18n('Extended Network'), '/all'],
          {separator: true},
          [i18n('Settings'), '/settings']
        ])
      ]),
      h('span.appTitle', [
        h('span.title', i18n('Patchwork')),
        api.app.html.progressNotifier()
      ]),
      h('span', [ api.app.html.search(api.app.navigate) ]),
      h('span.nav', [
        tab(i18n('Profile'), id),
        tab(i18n('Mentions'), '/mentions')
      ])
    ]),
    when(latestUpdate,
      h('div.info', [
        h('a.message -update', { href: 'https://github.com/ssbc/patchwork/releases' }, [
          h('strong', ['Patchwork ', latestUpdate, i18n(' has been released.')]), i18n(' Click here to download and view more info!'),
          h('a.ignore', {'ev-click': latestUpdate.ignore}, 'X')
        ])
      ])
    ),
    views.html
  ])

  var previewElement = api.app.linkPreview(container, 500)

  catchLinks(container, (href, external, anchor) => {
    if (!href) return
    if (external) {
      electron.shell.openExternal(href)
    } else {
      api.app.navigate(href)
    }
  })
  return [container, previewElement]

  // scoped

  function getSubscribedChannelMenu () {
    var channels = Array.from(subscribedChannels()).sort(localeCompare)

    if (channels.length) {
      return {
        label: i18n('Channels'),
        submenu: [
          { label: i18n('Browse All'),
            click () {
              navigate('/channels')
            }
          },
          {type: 'separator'}
        ].concat(channels.map(channel => {
          return {
            label: `#${channel}`,
            click () {
              navigate(`#${channel}`)
            }
          }
        }))
      }
    } else {
      return {
        label: i18n('Browse Channels'),
        click () {
          navigate('/channels')
        }
      }
    }
  }

  function dropTab (title, items) {
    var element = h('a -drop', {
      'ev-click': (ev) => {
        var rects = element.getBoundingClientRect()
        electron.remote.getCurrentWindow().webContents.getZoomFactor((factor) => {
          var menu = electron.remote.Menu.buildFromTemplate(items.map(item => {
            if (typeof item === 'function') {
              return item()
            } else if (item.separator) {
              return { type: 'separator' }
            } else {
              return {
                label: item[0],
                click () {
                  navigate(item[1])
                }
              }
            }
          }))
          menu.popup({
            window: electron.remote.getCurrentWindow(),
            x: Math.round(rects.left * factor),
            y: Math.round(rects.bottom * factor) + 4
          })
        })
      }
    }, title)
    return element
  }

  function navigate (href, anchor) {
    if (typeof href !== 'string') return false
    getExternalHandler(href, (err, handler) => {
      if (!err && handler) {
        handler(href)
      } else {
        // no external handler found, use page.html.render
        previewElement.cancel()
        views.setView(href, anchor)
      }
    })
  }

  function getExternalHandler (href, cb) {
    var link = ref.parseLink(href)
    if (link && ref.isMsg(link.link)) {
      api.sbot.async.get(link.link, function (err, value) {
        if (err) return cb(err)
        cb(null, api.app.sync.externalHandler({key: link.link, value, query: link.query}))
      })
    } else if (link && ref.isBlob(link.link)) {
      cb(null, function (href) {
        electron.shell.openExternal(api.blob.sync.url(href))
      })
    } else {
      cb()
    }
  }

  function tab (name, view) {
    var instance = views.get(view)
    return h('a', {
      'ev-click': function (ev) {
        var isSelected = views.currentView() === view
        var needsRefresh = instance.pendingUpdates && instance.pendingUpdates()

        // refresh if tab is clicked when there are pending items or the page is already selected
        if ((needsRefresh || isSelected) && instance.reload) {
          instance.reload()
        }
      },
      href: view,
      classList: [
        when(selected(view), '-selected')
      ]
    }, [
      name,
      when(instance.pendingUpdates, [
        ' (', instance.pendingUpdates, ')'
      ])
    ])
  }

  function selected (view) {
    return computed([views.currentView, view], (currentView, view) => {
      return currentView === view
    })
  }
}

function overrideConfig (config) {
  return {
    'patchwork/config': {
      gives: nest('config.sync.load'),
      create: function (api) {
        return nest('config.sync.load', () => config)
      }
    }
  }
}

function addCommand (id, cb) {
  return {
    [`patchwork/command/${id}`]: {
      gives: nest(id),
      create: function (api) {
        return nest(id, cb)
      }
    }
  }
}

function localeCompare (a, b) {
  return a.localeCompare(b)
}
