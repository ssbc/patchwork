var combine = require('depject')
var entry = require('depject/entry')
var electron = require('electron')
var h = require('mutant/h')
var Value = require('mutant/value')
var when = require('mutant/when')
var computed = require('mutant/computed')
var toCollection = require('mutant/dict-to-collection')
var MutantDict = require('mutant/dict')
var MutantMap = require('mutant/map')
var Url = require('url')
var insertCss = require('insert-css')
var nest = require('depnest')

module.exports = function (config) {
  var sockets = combine(
    overrideConfig(config),
    require('./modules'),
    require('./plugs'),
    require('patchcore'),
    require('./overrides')
  )

  var api = entry(sockets, nest({
    'page.html.render': 'first',
    'keys.sync.id': 'first',
    'blob.sync.url': 'first'
  }))

  var renderPage = api.page.html.render
  var id = api.keys.sync.id()

  var searchTimer = null
  var searchBox = h('input.search', {
    type: 'search',
    placeholder: 'word, @key, #channel'
  })

  searchBox.oninput = function () {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(doSearch, 500)
  }

  searchBox.onfocus = function () {
    if (searchBox.value) {
      doSearch()
    }
  }

  var forwardHistory = []
  var backHistory = []

  var views = MutantDict({
    // preload tabs (and subscribe to update notifications)
    '/public': renderPage('/public'),
    '/private': renderPage('/private'),
    [id]: renderPage(id),
    '/mentions': renderPage('/mentions')
  })

  var lastViewed = {}
  var defaultViews = views.keys()

  // delete cached view after 30 mins of last seeing
  setInterval(() => {
    views.keys().forEach((view) => {
      if (!defaultViews.includes(view)) {
        if (lastViewed[view] !== true && Date.now() - lastViewed[view] > (5 * 60e3) && view !== currentView()) {
          views.delete(view)
        }
      }
    })
  }, 60e3)

  var canGoForward = Value(false)
  var canGoBack = Value(false)
  var currentView = Value('/public')

  var mainElement = h('div.main', MutantMap(toCollection(views), (item) => {
    return h('div.view', {
      hidden: computed([item.key, currentView], (a, b) => a !== b)
    }, [ item.value ])
  }))

  insertCss(require('./styles'))

  return h(`MainWindow -${process.platform}`, {
    events: {
      click: catchLinks
    }
  }, [
    h('div.top', [
      h('span.history', [
        h('a', {
          'ev-click': goBack,
          classList: [ when(canGoBack, '-active') ]
        }, '<'),
        h('a', {
          'ev-click': goForward,
          classList: [ when(canGoForward, '-active') ]
        }, '>')
      ]),
      h('span.nav', [
        tab('Public', '/public'),
        tab('Private', '/private')
      ]),
      h('span.appTitle', ['Patchwork']),
      h('span', [ searchBox ]),
      h('span.nav', [
        tab('Profile', id),
        tab('Mentions', '/mentions')
      ])
    ]),
    mainElement
  ])

  // scoped

  function catchLinks (ev) {
    if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.defaultPrevented) {
      return true
    }

    var anchor = null
    for (var n = ev.target; n.parentNode; n = n.parentNode) {
      if (n.nodeName === 'A') {
        anchor = n
        break
      }
    }
    if (!anchor) return true

    var href = anchor.getAttribute('href')

    if (href) {
      var url = Url.parse(href)
      if (url.host) {
        electron.shell.openExternal(href)
      } else if (href.charAt(0) === '&') {
        electron.shell.openExternal(api.blob.sync.url(href))
      } else if (href !== '#') {
        setView(href)
      }
    }

    ev.preventDefault()
    ev.stopPropagation()
  }

  function tab (name, view) {
    var instance = views.get(view)
    lastViewed[view] = true
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

  function goBack () {
    if (backHistory.length) {
      canGoForward.set(true)
      forwardHistory.push(currentView())
      currentView.set(backHistory.pop())
      canGoBack.set(backHistory.length > 0)
    }
  }

  function goForward () {
    if (forwardHistory.length) {
      backHistory.push(currentView())
      currentView.set(forwardHistory.pop())
      canGoForward.set(forwardHistory.length > 0)
      canGoBack.set(true)
    }
  }

  function setView (view) {
    if (!views.has(view)) {
      views.put(view, renderPage(view))
    }

    if (lastViewed[view] !== true) {
      lastViewed[view] = Date.now()
    }

    if (currentView() && lastViewed[currentView()] !== true) {
      lastViewed[currentView()] = Date.now()
    }

    if (view !== currentView()) {
      canGoForward.set(false)
      canGoBack.set(true)
      forwardHistory.length = 0
      backHistory.push(currentView())
      currentView.set(view)
    }
  }

  function doSearch () {
    var value = searchBox.value.trim()
    if (value.startsWith('/') || value.startsWith('?') || value.startsWith('@') || value.startsWith('#') || value.startsWith('%')) {
      setView(value)
    } else if (value.trim()) {
      setView(`?${value.trim()}`)
    } else {
      setView('/public')
    }
  }

  function selected (view) {
    return computed([currentView, view], (currentView, view) => {
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
