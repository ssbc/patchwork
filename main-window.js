var combine = require('depject')
var entry = require('depject/entry')
var electron = require('electron')
var h = require('mutant/h')
var when = require('mutant/when')
var computed = require('mutant/computed')
var catchLinks = require('./lib/catch-links')
var insertCss = require('insert-css')
var nest = require('depnest')
var LatestUpdate = require('./lib/latest-update')

require('./lib/context-menu-and-spellcheck.js')

module.exports = function (config) {
  var sockets = combine(
    overrideConfig(config),
    require('./modules'),
    require('./plugs'),
    require('patchcore'),
    require('./overrides')
  )

  var api = entry(sockets, nest({
    'keys.sync.id': 'first',
    'blob.sync.url': 'first',
    'page.html.render': 'first',
    'app.html.search': 'first',
    'app.views': 'first',
    'app.html.progressNotifier': 'first'
  }))

  var id = api.keys.sync.id()
  var latestUpdate = LatestUpdate()

  var views = api.app.views(api.page.html.render, [
    '/public', '/private', id, '/mentions'
  ])

  insertCss(require('./styles'))

  var container = h(`MainWindow -${process.platform}`, [
    h('div.top', [
      h('span.history', [
        h('a', {
          'ev-click': views.goBack,
          classList: [ when(views.canGoBack, '-active') ]
        }, '<'),
        h('a', {
          'ev-click': views.goForward,
          classList: [ when(views.canGoForward, '-active') ]
        }, '>')
      ]),
      h('span.nav', [
        tab('Public', '/public'),
        tab('Private', '/private')
      ]),
      h('span.appTitle', ['Patchwork']),
      h('span', [ api.app.html.search(views.setView) ]),
      h('span.nav', [
        tab('Profile', id),
        tab('Mentions', '/mentions')
      ])
    ]),
    when(latestUpdate,
      h('div.info', [
        h('a.message -update', { href: 'https://github.com/mmckegg/patchwork-next/releases' }, [
          h('strong', ['Patchwork ', latestUpdate, ' has been released.']), ' Click here for more info!'
        ])
      ])
    ),
    api.app.html.progressNotifier(),
    views.html
  ])

  catchLinks(container, (href, external) => {
    if (external) {
      electron.shell.openExternal(href)
    } else if (href[0] === '&') {
      electron.shell.openExternal(api.blob.sync.url(href))
    } else {
      views.setView(href)
    }
  })

  return container

  // scoped

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
  return [{
    gives: nest('config.sync.load'),
    create: function (api) {
      return nest('config.sync.load', () => config)
    }
  }]
}
