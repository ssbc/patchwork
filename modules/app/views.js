var { h, Value, Dict, dictToCollection, map, computed } = require('mutant')
var nest = require('depnest')

exports.gives = nest('app.views')

exports.create = function (api) {
  return nest('app.views', function (renderPage, defaultViews) {
    var views = Dict({})

    var forwardHistory = []
    var backHistory = []

    if (defaultViews) {
      defaultViews.forEach((view) => {
        views.put(view, renderPage(view))
      })
    }

    var lastViewed = {}

    // delete cached view after 5 mins of last seeing
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
    var currentView = Value(defaultViews && defaultViews[0] || null)

    var viewCollection = dictToCollection(views)
    var html = h('div.main', map(viewCollection, (item) => {
      return h('div.view', {
        attributes: {
          'data-href': item.key
        },
        hidden: computed([item.key, currentView], (a, b) => a !== b)
      }, [ item.value ])
    }))

    return {
      get: views.get,
      defaultViews,
      canGoForward,
      canGoBack,
      currentView,
      setView,
      goBack,
      goForward,
      html
    }

    // scoped

    function goBack () {
      if (backHistory.length) {
        canGoForward.set(true)
        forwardHistory.push(currentView())

        var view = backHistory.pop()
        loadView(view)

        currentView.set(view)
        canGoBack.set(backHistory.length > 0)
      }
    }

    function goForward () {
      if (forwardHistory.length) {
        backHistory.push(currentView())

        var view = forwardHistory.pop()
        loadView(view)

        currentView.set(view)
        canGoForward.set(forwardHistory.length > 0)
        canGoBack.set(true)
      }
    }

    function loadView (view) {
      if (!views.has(view)) {
        var page = renderPage(view)
        if (page) {
          if (page.uniqueKey) {
            views.keys().forEach(k => {
              if (views.get(k).uniqueKey === page.uniqueKey) {
                views.delete(k)
              }
            })
          }
          views.put(view, page)
        }
      }
    }

    function setView (view) {
      loadView(view)

      if (views.has(view)) {
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
    }
  })
}
