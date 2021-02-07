const { h, Value, when, computed } = require('mutant')
const pull = require('pull-stream')
const TextNodeSearcher = require('text-node-searcher')
const whitespace = /\s+/
const pullAbortable = require('pull-abortable')
const Scroller = require('../../../../scroller')
const nest = require('depnest')
const Proxy = require('mutant/proxy')
const ref = require('ssb-ref')
const escapeStringRegexp = require('escape-string-regexp')

exports.needs = nest({
  'sbot.pull.stream': 'first',
  'message.html.render': 'first',
  'intl.sync.i18n': 'first',
  'sbot.pull.backlinks': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', function channel (path) {
    if (path[0] !== '?') return

    const query = path.substr(1).trim()
    const done = Value(false)
    const loading = Proxy(true)
    const count = Value(0)
    const updates = Value(0)
    let aborter = null

    const searchHeader = h('div', { className: 'PageHeading' }, [
      h('h1', [h('strong', i18n('Search Results:')), ' ', query])
    ])

    const updateLoader = h('a Notifier -loader', { href: '#', 'ev-click': refresh }, [
      'Show ', h('strong', [updates]), ' ', plural(updates, i18n('update'), i18n('updates'))
    ])

    const content = Proxy()
    const container = h('Scroller', {
      style: { overflow: 'auto' }
    }, [
      h('div.wrapper', [
        h('SearchPage', [
          searchHeader,
          content,
          when(loading, h('Loading -search'), h('div', {
            style: {
              padding: '60px 0',
              'font-size': '150%'
            }
          }, [h('strong', i18n('Search completed.')), ' ', count, ' ', plural(count, i18n('result found'), i18n('results found'))]))
        ])
      ])
    ])

    const realtimeAborter = pullAbortable()

    pull(
      getStream(query, true),
      realtimeAborter,
      pull.drain(() => {
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

      const scroller = Scroller(container, content(), renderMsg, err => {
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

      loading.set(computed([done, scroller.queue], (done) => {
        return !done
      }))
    }

    function renderMsg (msg) {
      const el = h('FeedEvent', api.message.html.render(msg, {
        renderUnknown: true,
        outOfContext: true
      }))
      highlight(el, createOrRegExp(query.split(whitespace)))
      return el
    }
  })

  function getStream (queryText, realtime = false) {
    if (ref.isLink(queryText) || queryText.startsWith('#')) {
      return api.sbot.pull.backlinks({
        query: [{ $filter: { dest: queryText } }],
        reverse: true,
        old: !realtime,
        index: 'DTA' // use asserted timestamps
      })
    } else {
      const { author, query, onlyPrivate } = parseSearch(queryText)
      return pull(
        onlyPrivate
          ? api.sbot.pull.stream(sbot => sbot.patchwork.privateSearch({ old: !realtime, reverse: true, query: query.split(whitespace), author }))
          : realtime
            ? api.sbot.pull.stream(sbot => sbot.patchwork.linearSearch({ old: false, query: query.split(whitespace) }))
            : api.sbot.pull.stream(sbot => sbot.search.query({ query })),
        pull.filter(msg => {
          if (author && msg.value.author !== author) return false
          return true
        })
      )
    }
  }
}

function parseSearch (query) {
  const parts = query.split(/\s/)
  const result = []
  let author = null
  let onlyPrivate = false
  parts.forEach(part => {
    if (part.startsWith('author:')) {
      part = part.slice(('author:').length)
      if (ref.isFeedId(part)) {
        author = part
      }
    } else if (part === 'is:private') {
      onlyPrivate = true
    } else {
      result.push(part)
    }
  })

  return {
    query: result.join(' '),
    onlyPrivate,
    author
  }
}

function createOrRegExp (ary) {
  return new RegExp(ary.map(function (e) {
    return '\\b' + escapeStringRegexp(e) + '\\b'
  }).join('|'), 'i')
}

function highlight (el, query) {
  if (el) {
    const searcher = new TextNodeSearcher({ container: el })
    searcher.query = query
    searcher.highlight()
    return el
  }
}

function RemoveHook (fn) {
  return function () {
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
