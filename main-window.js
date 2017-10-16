var combine = require('depject')
var entry = require('depject/entry')
var electron = require('electron')
var h = require('mutant/h')
var Value = require('mutant/value')
var when = require('mutant/when')
var onceTrue = require('mutant/once-true')
var computed = require('mutant/computed')
var catchLinks = require('./lib/catch-links')
var ObserveLinkHover = require('./lib/observe-link-hover')
var insertCss = require('insert-css')
var nest = require('depnest')
var LatestUpdate = require('./lib/latest-update')
var ref = require('ssb-ref')
var setupContextMenuAndSpellCheck = require('./lib/context-menu-and-spellcheck')
var watch = require('mutant/watch')

module.exports = function (config) {
  var sockets = combine(
    overrideConfig(config),
    addCommand('app.navigate', setView),
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
    'app.sync.externalHandler': 'first',
    'app.html.progressNotifier': 'first',
    'profile.sheet.edit': 'first',
    'profile.html.preview': 'first',
    'app.navigate': 'first',
    'channel.obs.subscribed': 'first',
    'settings.obs.get': 'first',
    'intl.sync.i18n': 'first',
  }))

  setupContextMenuAndSpellCheck(api.config.sync.load())

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


  watch(api.settings.obs.get('patchwork.theme', 'light'), name => {
    Array.from(document.head.children)
      .filter(c => c.tagName == 'STYLE')
      .forEach(c => c.innerText = '')

    var theme = require('./styles')[name]
    if (!theme) theme = require('./styles')['light']
    insertCss(theme)
  })

  var container = h(`MainWindow -${process.platform}`, [
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
        tab(i18n("Public"), '/public'),
        tab(i18n("Private"), '/private'),
        dropTab(i18n('More'), [
          getSubscribedChannelMenu,
          [i18n('Gatherings'), '/gatherings'],
          [i18n('Extended Network'), '/all'],
          {separator: true},
          [i18n('Settings'), '/settings']
        ])
      ]),
      h('span.appTitle', [
        h('span.title', i18n("Patchwork")),
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

  var currentHover = ObserveLinkHover(container, 500)
  var previewElement = Value()

  currentHover(element => {
    var href = element && element.getAttribute('href')
    var preview = null

    if (href) {
      if (ref.isFeed(href)) {
        preview = api.profile.html.preview(href)
      } else if (href.includes('://')) {
        preview = h('ProfilePreview', [
          h('section', [
            h('strong', [i18n('External Link'), ' 🌐']), h('br'),
            h('code', href)
          ])
        ])
      }
    }

    if (preview) {
      var rect = element.getBoundingClientRect()
      var maxLeft = window.innerWidth - 510
      var maxTop = window.innerHeight - 100
      var distanceFromRight = window.innerWidth - rect.right
      var shouldDisplayBeside = rect.bottom > maxTop || rect.left < 100 || distanceFromRight < 100

      if (shouldDisplayBeside && rect.bottom > 50) {
        preview.style.top = `${Math.min(rect.top, maxTop)}px`
        if (rect.right > maxLeft) {
          preview.style.left = `${rect.left - 510}px`
        } else {
          preview.style.left = `${rect.right + 5}px`
        }
      } else {
        preview.style.top = `${rect.bottom + 5}px`
        preview.style.left = `${Math.min(rect.left, maxLeft)}px`
      }

      previewElement.set(preview)
    } else if (element !== false) {
      previewElement.set(null)
    }
  })

  catchLinks(container, (href, external, anchor) => {
    if (external) {
      electron.shell.openExternal(href)
    } else if (ref.isBlob(href)) {
      electron.shell.openExternal(api.blob.sync.url(href))
    } else if (ref.isMsg(href)) {
      getExternalHandler(href, (err, handler) => {
        if (err) throw err
        if (handler) {
          handler(href)
        } else {
          api.app.navigate(href, anchor)
        }
      })
    } else {
      api.app.navigate(href, anchor)
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
              setView('/channels')
            }
          },
          {type: 'separator'}
        ].concat(channels.map(channel => {
          return {
            label: `#${channel}`,
            click () {
              setView(`#${channel}`)
            }
          }
        }))
      }
    } else {
      return {
        label: i18n('Browse Channels'),
        click () {
          setView('/channels')
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
                  setView(item[1])
                }
              }
            }
          }))
          menu.popup(electron.remote.getCurrentWindow(), {
            x: Math.round(rects.left * factor),
            y: Math.round(rects.bottom * factor) + 4,
            async: true
          })
        })
      }
    }, title)
    return element
  }

  function setView (href, anchor) {
    currentHover.cancel()
    previewElement.set(null)
    views.setView(href, anchor)
  }

  function getExternalHandler (key, cb) {
    api.sbot.async.get(key, function (err, value) {
      if (err) return cb(err)
      cb(null, api.app.sync.externalHandler({key, value}))
    })
  }

  function tab (name, view) {
    var instance = views.get(view)
    return h('a', {
      'ev-click': function (ev) {
        if (instance.pendingUpdates && instance.pendingUpdates() && instance.reload) {
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
