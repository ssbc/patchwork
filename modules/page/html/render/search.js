var { h, Value, when, computed } = require('mutant')
var pull = require('pull-stream')
var TextNodeSearcher = require('text-node-searcher')
var whitespace = /\s+/
var pullAbortable = require('pull-abortable')
var Scroller = require('../../../../lib/scroller')
var nextStepper = require('../../../../lib/next-stepper')
var nest = require('depnest')
var Proxy = require('mutant/proxy')

exports.needs = nest({
  'sbot.pull.stream': 'first',
  'keys.sync.id': 'first',
  'message.html.render': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path[0] !== '?') return

    var queryStr = path.substr(1).trim()
    var query = queryStr.split(whitespace)
    var done = Value(false)
    var loading = Proxy(true)
    var count = Value(0)
    var updates = Value(0)
    var aborter = null

    const searchHeader = h('div', {className: 'PageHeading'}, [
      h('h1', [h('strong', 'Search Results:'), ' ', query.join(' ')])
    ])

    var updateLoader = h('a Notifier -loader', { href: '#', 'ev-click': refresh }, [
      'Show ', h('strong', [updates]), ' ', plural(updates, 'update', 'updates')
    ])

    var content = Proxy()
    var container = h('Scroller', {
      style: { overflow: 'auto' }
    }, [
      h('div.wrapper', [
        h('SearchPage', [
          searchHeader,
          content,
          when(loading, h('Loading -search'), h('div', {
            style: {
              'padding': '60px 0',
              'font-size': '150%'
            }
          }, [h('strong', 'Search completed.'), ' ', count, ' ', plural(count, 'result', 'results'), ' found']))
        ])
      ])
    ])

    var realtimeAborter = pullAbortable()

    pull(
      api.sbot.pull.stream(sbot => sbot.patchwork.linearSearch({old: false, query})),
      realtimeAborter,
      pull.drain(msg => {
        updates.set(updates() + 1)
      })
    )

    refresh()

    return h('SplitView', {
      hooks: [
        RemoveHook(() => {
          // terminate search if removed from dom
          // this is triggered whenever a new search is started
          realtimeAborter.abort()
          aborter && aborter.abort()
        })
      ],
      uniqueKey: 'search'
    }, [
      h('div.main', [
        when(updates, updateLoader),
        container
      ])
    ])

    // scoped

    function refresh () {
      if (aborter) {
        aborter.abort()
      }

      aborter = pullAbortable()

      updates.set(0)
      content.set(h('section.content'))

      var scroller = Scroller(container, content(), renderMsg, err => {
        if (err) console.log(err)
        done.set(true)
      })

      pull(
        api.sbot.pull.stream(sbot => nextStepper(getStream, {
          reverse: true,
          limit: 5,
          query
        })),
        pull.through(() => count.set(count() + 1)),
        aborter,
        pull.filter(msg => msg.value),
        scroller
      )

      loading.set(computed([done, scroller.queue], (done, queue) => {
        return !done && queue < 5
      }))
    }

    function getStream (opts) {
      if (opts.lt != null && !opts.lt.marker) {
        // if an lt has been specified that is not a marker, assume stream is finished
        return pull.empty()
      } else {
        return api.sbot.pull.stream(sbot => sbot.patchwork.linearSearch(opts))
      }
    }

    function renderMsg (msg) {
      var el = h('FeedEvent', api.message.html.render(msg))
      highlight(el, createOrRegExp(query))
      return el
    }
  })
}

function createOrRegExp (ary) {
  return new RegExp(ary.map(function (e) {
    return '\\b' + e + '\\b'
  }).join('|'), 'i')
}

function highlight (el, query) {
  if (el) {
    var searcher = new TextNodeSearcher({container: el})
    searcher.query = query
    searcher.highlight()
    return el
  }
}

function RemoveHook (fn) {
  return function (element) {
    return fn
  }
}

function plural (value, single, many) {
  return computed(value, (value) => {
    if (value === 1) {
      return single
    } else {
      return many
    }
  })
}
