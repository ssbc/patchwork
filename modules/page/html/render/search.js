var { h, Value, when, computed } = require('mutant')
var pull = require('pull-stream')
var TextNodeSearcher = require('text-node-searcher')
var whitespace = /\s+/
var pullAbortable = require('pull-abortable')
var Scroller = require('../../../../lib/scroller')
var nest = require('depnest')
var Proxy = require('mutant/proxy')
var ref = require('ssb-ref')

exports.needs = nest({
  'sbot.pull.stream': 'first',
  'keys.sync.id': 'first',
  'message.html.render': 'first',
  'intl.sync.i18n': 'first',
  'sbot.pull.backlinks': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', function channel (path) {
    if (path[0] !== '?') return

    var query = path.substr(1).trim()
    var done = Value(false)
    var loading = Proxy(true)
    var count = Value(0)
    var updates = Value(0)
    var aborter = null

    const searchHeader = h('div', {className: 'PageHeading'}, [
      h('h1', [h('strong', i18n('Search Results:')), ' ', query])
    ])

    var updateLoader = h('a Notifier -loader', { href: '#', 'ev-click': refresh }, [
      'Show ', h('strong', [updates]), ' ', plural(updates, i18n('update'), i18n('updates'))
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
          }, [h('strong', i18n('Search completed.')), ' ', count, ' ', plural(count, i18n('result found'), i18n('results found'))]))
        ])
      ])
    ])

    var realtimeAborter = pullAbortable()

    pull(
      getStream(query, true),
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
        getStream(query, false),
        pull.through(() => count.set(count() + 1)),
        aborter,
        pull.filter(msg => msg.value),
        scroller
      )

      loading.set(computed([done, scroller.queue], (done, queue) => {
        return !done
      }))
    }

    function renderMsg (msg) {
      var el = h('FeedEvent', api.message.html.render(msg))
      highlight(el, createOrRegExp(query.split(whitespace)))
      return el
    }
  })

  function getStream (query, realtime = false) {
    if (ref.isLink(query) || query.startsWith('#')) {
      return api.sbot.pull.backlinks({
        query: [ {$filter: { dest: query }} ],
        reverse: true,
        old: !realtime,
        index: 'DTA' // use asserted timestamps
      })
    } else {
      if (realtime) {
        return api.sbot.pull.stream(sbot => sbot.patchwork.linearSearch({old: false, query: query.split(whitespace)}))
      } else {
        return api.sbot.pull.stream(sbot => sbot.search.query({query}))
      }
    }
  }
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
