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
var requireStyle = require('require-style')
var ssbUri = require('ssb-uri')

try {
  var mouseForwardBack = require('mouse-forward-back')
} catch (err) {
  mouseForwardBack = false
}

module.exports = function (config) {
  var sockets = combine(
    overrideConfig(config),
    addCommand('app.navigate', navigate),
    require('./modules'),
    require('patch-settings')
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

  const i18n = api.intl.sync.i18n
  setupContextMenuAndSpellCheck(api.config.sync.load(), { navigate, get: api.sbot.async.get })

  var id = api.keys.sync.id()
  var latestUpdate = LatestUpdate()
  var subscribedChannels = api.channel.obs.subscribed(id)
  var includeParticipating = api.settings.obs.get('patchwork.includeParticipating', false)

  // prompt to setup profile on first use
  onceTrue(api.sbot.obs.connection, (sbot) => {
    sbot.latestSequence(api.keys.sync.id(), (err, key) => {
      if (err) {
        // This may throw an error if the feed doesn't have any messages, but
        // that shouldn't cause any problems so this error can be ignored.
      }

      if (key == null) {
        api.profile.sheet.edit({ usePreview: false })
      }
    })
  })

  var defaultViews = computed(includeParticipating, (includeParticipating) => {
    var result = [
      '/public', '/private', '/mentions'
    ]

    // allow user to choose in settings whether to show participating tab
    if (includeParticipating) {
      result.push('/participating')
    }

    return result
  })

  var views = api.app.views(api.page.html.render, defaultViews)

  var pendingCount = views.get('/mentions').pendingUpdates

  watch(pendingCount, count => {
    electron.remote.app.setBadgeCount(count)
  })

  electron.ipcRenderer.on('goForward', views.goForward)
  electron.ipcRenderer.on('goBack', views.goBack)

  if (mouseForwardBack) {
    mouseForwardBack.register((direction) => {
      if (direction === 'back') {
        views.goBack()
      } else if (direction === 'forward') {
        views.goForward()
      }
    },
    electron.remote.getCurrentWindow().getNativeWindowHandle())
  }

  document.head.appendChild(
    h('style', {
      innerHTML: computed(api.settings.obs.get('patchwork.theme', 'light'), themeName => {
        return themes[themeName] || themes['light']
      })
    })
  )

  document.head.appendChild(
    h('style', {
      innerHTML: computed(api.settings.obs.get('patchwork.theme', 'light'), themeName => {
        const syntaxThemeOptions = {
          light: 'github',
          dark: 'monokai'
        }

        const syntaxTheme = syntaxThemeOptions[themeName] || syntaxThemeOptions['light']
        return requireStyle(`highlight.js/styles/${syntaxTheme}.css`)
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
    classList: [ when(api.app.fullscreen(), '-fullscreen') ],
    'ev-dragover': preventDefault,
    'ev-drop': preventDefault,
    'ev-dragstart': preventDefaultUnlessImage
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
          subMenu(i18n('Participating'), [
            [i18n('All Threads'), '/participating'],
            [i18n('Threads Started By You'), '/your-posts']
          ]),
          [i18n('Gatherings'), '/gatherings'],
          [i18n('Tags'), `/tags/all/${encodeURIComponent(id)}`],
          [i18n('Extended Network'), '/all'],
          { separator: true },
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
        computed(includeParticipating, (includeParticipating) => {
          if (includeParticipating) return tab(i18n('Participating'), '/participating')
        }),
        tab(i18n('Mentions'), '/mentions')
      ])
    ]),
    when(latestUpdate,
      h('div.info', [
        h('a.message -update', { href: 'https://github.com/ssbc/patchwork/releases' }, [
          h('strong', ['Patchwork ', latestUpdate, i18n(' has been released.')]), i18n(' Click here to download and view more info!'),
          h('a.ignore', { 'ev-click': latestUpdate.ignore }, 'X')
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
      api.app.navigate(href, anchor)
    }
  })
  return [container, previewElement]

  // scoped

  function subMenu (label, items) {
    return function () {
      return {
        label,
        submenu: items.map(item => {
          return {
            label: item[0],
            click () {
              navigate(item[1])
            }
          }
        })
      }
    }
  }

  function getSubscribedChannelMenu () {
    var channels = Array.from(subscribedChannels()).sort(localeCompare)

    if (channels.length) {
      return {
        label: i18n('Channels'),
        submenu: [
          { label: i18n('Browse Recently Active'),
            click () {
              navigate('/channels')
            }
          },
          { type: 'separator' }
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
        if (href.startsWith('ssb:')) {
          try {
            href = ssbUri.toSigilLink(href)
          } catch (e) {
            // error can be safely ignored
            // it just means this isn't an SSB URI
          }
        }

        // no external handler found, use page.html.render
        previewElement.cancel()
        views.setView(href, anchor)
      }
    })
  }

  function getExternalHandler (href, cb) {
    var link = ref.parseLink(href)
    if (link && ref.isMsg(link.link)) {
      var params = { id: link.link }
      if (link.query && link.query.unbox) {
        params.private = true
        params.unbox = link.query.unbox
      }
      api.sbot.async.get(params, function (err, value) {
        if (err) return cb(err)
        cb(null, api.app.sync.externalHandler({ key: link.link, value, query: link.query }))
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
        var instance = views.get(view)
        var isSelected = views.currentView() === view
        var needsRefresh = instance && instance.pendingUpdates && instance.pendingUpdates()

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
      instance ? when(instance.pendingUpdates, [
        ' (', instance.pendingUpdates, ')'
      ]) : null
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

function preventDefault (ev) {
  ev.preventDefault()
}

function preventDefaultUnlessImage (ev) {
  if (ev.target.nodeName !== 'IMG') {
    ev.preventDefault()
  }
}
