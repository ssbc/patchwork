var combine = require('depject')
var entry = require('depject/entry')
var electron = require('electron')
var h = require('mutant/h')
var when = require('mutant/when')
var onceTrue = require('mutant/once-true')
var computed = require('mutant/computed')
var catchLinks = require('./lib/catch-links')
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
    require('patchwork-gatherings'),
    require('./modules'),
    require('./plugs'),
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
    'app.views': 'first',
    'app.sync.externalHandler': 'first',
    'app.html.progressNotifier': 'first',
    'profile.sheet.edit': 'first',
    'app.navigate': 'first'
  }))

  setupContextMenuAndSpellCheck(api.config.sync.load())

  var id = api.keys.sync.id()
  var latestUpdate = LatestUpdate()

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

  var pendingCount = computed([
    views.get('/public').pendingUpdates,
    views.get('/private').pendingUpdates
  ], (...counts) => {
    return counts.reduce((a, b) => a + b)
  })

  watch(pendingCount, count => {
    electron.remote.app.setBadgeCount(count)
  })


  insertCss(require('./styles'))

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
        tab('Public', '/public'),
        tab('Private', '/private')
      ]),
      h('span.appTitle', ['Patchwork']),
      h('span', [ api.app.html.search(api.app.navigate) ]),
      h('span.nav', [
        tab('Profile', id),
        tab('Mentions', '/mentions')
      ])
    ]),
    when(latestUpdate,
      h('div.info', [
        h('a.message -update', { href: 'https://github.com/ssbc/patchwork/releases' }, [
          h('strong', ['Patchwork ', latestUpdate, ' has been released.']), ' Click here to download and view more info!'
        ])
      ])
    ),
    api.app.html.progressNotifier(),
    views.html
  ])

  catchLinks(container, (href, external) => {
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
          api.app.navigate(href)
        }
      })
    } else {
      api.app.navigate(href)
    }
  })

  return container

  // scoped

  function setView (href) {
    views.setView(href)
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
