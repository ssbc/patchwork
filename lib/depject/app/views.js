const { h, Value, Dict, dictToCollection, map, computed, resolve, watch } = require('mutant')
const nest = require('depnest')

exports.gives = nest('app.views')

exports.create = function () {
  return nest('app.views', function (renderPage, defaultViews) {
    const views = Dict({})

    const forwardHistory = []
    const backHistory = []

    // if defaultViews changes, load them!
    watch(defaultViews, (defaultViews) => {
      if (defaultViews) {
        defaultViews.forEach((view) => {
          if (!views.has(view)) {
            views.put(view, renderPage(view))
          }
        })
      }
    })

    const lastViewed = {}

    // delete cached view after 5 mins of last seeing
    setInterval(() => {
      views.keys().forEach((view) => {
        if (!(resolve(defaultViews) || []).includes(view)) {
          if (lastViewed[view] !== true && Date.now() - lastViewed[view] > (5 * 60e3) && view !== currentView()) {
            views.delete(view)
          }
        }
      })
    }, 60e3)

    const canGoForward = Value(false)
    const canGoBack = Value(false)
    const currentView = Value((resolve(defaultViews) || [])[0] || null)

    const viewCollection = dictToCollection(views)
    const html = h('div.main', map(viewCollection, (item) => {
      return h('div.view', {
        attributes: {
          'data-href': item.key
        },
        hidden: computed([item.key, currentView], (a, b) => a !== b)
      }, [item.value])
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

        const view = backHistory.pop()
        loadView(view)

        currentView.set(view)
        canGoBack.set(backHistory.length > 0)
      }
    }

    function goForward () {
      if (forwardHistory.length) {
        backHistory.push(currentView())

        const view = forwardHistory.pop()
        loadView(view)

        currentView.set(view)
        canGoForward.set(forwardHistory.length > 0)
        canGoBack.set(true)
      }
    }

    function loadView (view) {
      if (!views.has(view)) {
        const page = renderPage(view)
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

    function setView (view, anchor) {
      loadView(view)

      if (views.has(view)) {
        if (lastViewed[view] !== true) {
          lastViewed[view] = Date.now()
        }

        if (currentView() && lastViewed[currentView()] !== true) {
          lastViewed[currentView()] = Date.now()
        }

        const viewElement = views.get(view)

        if (viewElement && typeof viewElement.setAnchor === 'function') {
          viewElement.setAnchor(anchor)
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
