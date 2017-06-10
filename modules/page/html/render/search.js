const { h, Struct, Value, when, computed } = require('mutant')
const pull = require('pull-stream')
const Scroller = require('pull-scroll')
const TextNodeSearcher = require('text-node-searcher')
const whitespace = /\s+/
const pullAbortable = require('pull-abortable')
var nest = require('depnest')
var Next = require('pull-next')
var defer = require('pull-defer')
var pullCat = require('pull-cat')

exports.needs = nest({
  'sbot.pull.search': 'first',
  'sbot.pull.log': 'first',
  'keys.sync.id': 'first',
  'message.html.render': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path[0] !== '?') return

    var queryStr = path.substr(1).trim()
    var query = queryStr.split(whitespace)
    var matchesQuery = searchFilter(query)

    const search = Struct({
      isLinear: Value(),
      linear: Struct({
        checked: Value(0),
        isDone: Value(false)
      }),
      fulltext: Struct({
        isDone: Value(false)
      }),
      matches: Value(0)
    })

    const hasNoFulltextMatches = computed([
      search.fulltext.isDone, search.matches
    ], (done, matches) => {
      return done && matches === 0
    })

    const searchHeader = h('Search', [
      h('div', {className: 'PageHeading'}, [
        h('h1', [h('strong', 'Search Results:'), ' ', query.join(' ')]),
        when(search.isLinear,
          h('div.meta', ['Searched: ', search.linear.checked]),
          h('section.details', when(hasNoFulltextMatches, h('div.matches', 'No matches')))
        )
      ])
    ])

    var content = h('section.content')
    var container = h('Scroller', {
      style: { overflow: 'auto' }
    }, [
      h('div.wrapper', [
        searchHeader,
        content,
        when(search.linear.isDone, null, h('Loading -search'))
      ])
    ])

    var realtimeAborter = pullAbortable()

    pull(
      api.sbot.pull.log({old: false}),
      pull.filter(matchesQuery),
      realtimeAborter,
      Scroller(container, content, renderMsg, true, false)
    )

    // pull(
    //   nextStepper(api.sbot.pull.search, {query: queryStr, reverse: true, limit: 500, live: false}),
    //   fallback((err) => {
    //     if (err === true) {
    //       search.fulltext.isDone.set(true)
    //     } else if (/^no source/.test(err.message)) {
    //       search.isLinear.set(true)
    //       return pull(
    //         nextStepper(api.sbot.pull.log, {reverse: true, limit: 500, live: false}),
    //         pull.through((msg) => search.linear.checked.set(search.linear.checked() + 1)),
    //         pull.filter(matchesQuery)
    //       )
    //     }
    //   }),
    //   pull.through(() => search.matches.set(search.matches() + 1)),
    //   Scroller(container, content, renderMsg, false, false)
    // )

    // disable full text for now
    var aborter = pullAbortable()
    search.isLinear.set(true)
    pull(
      nextStepper(api.sbot.pull.log, {reverse: true, limit: 500, live: false, delay: 100}),
      pull.through((msg) => search.linear.checked.set(search.linear.checked() + 1)),
      pull.filter(matchesQuery),
      pull.through(() => search.matches.set(search.matches() + 1)),
      aborter,
      Scroller(container, content, renderMsg, false, false, err => {
        if (err) console.log(err)
        search.linear.isDone.set(true)
      })
    )

    return h('SplitView', {
      hooks: [
        RemoveHook(() => {
          // terminate search if removed from dom
          // this is triggered whenever a new search is started
          realtimeAborter.abort()
          aborter.abort()
        })
      ],
      uniqueKey: 'search'
    }, [
      h('div.main', container)
    ])

    // scoped

    function renderMsg (msg) {
      var el = h('div.result', api.message.html.render(msg))
      highlight(el, createOrRegExp(query))
      return el
    }
  })
}

function andSearch (terms, inputs) {
  for (var i = 0; i < terms.length; i++) {
    var match = false
    for (var j = 0; j < inputs.length; j++) {
      if (terms[i].test(inputs[j])) match = true
    }
    // if a term was not matched by anything, filter this one
    if (!match) return false
  }
  return true
}

function searchFilter (terms) {
  return function (msg) {
    var c = msg && msg.value && msg.value.content
    return c && (
      msg.key === terms[0] || andSearch(terms.map(function (term) {
        return new RegExp('\\b' + term + '\\b', 'i')
      }), [c.text, c.name, c.title])
    )
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

function fallback (reader) {
  var fallbackRead
  return function (read) {
    return function (abort, cb) {
      read(abort, function next (end, data) {
        if (end && reader && (fallbackRead = reader(end))) {
          reader = null
          read = fallbackRead
          read(abort, next)
        } else {
          cb(end, data)
        }
      })
    }
  }
}

function nextStepper (createStream, opts, property, range) {
  range = range || (opts.reverse ? 'lt' : 'gt')
  property = property || 'timestamp'

  var last = null
  var count = -1

  return Next(function () {
    if (last) {
      if (count === 0) return
      var value = opts[range] = get(last, property)
      if (value == null) return
      last = null
    }
    var result = defer.source()

    window.requestIdleCallback(() => {
      result.resolve(pull(
        createStream(clone(opts)),
        pull.through(function (msg) {
          count++
          if (!msg.sync) {
            last = msg
          }
        }, function (err) {
          // retry on errors...
          if (err) {
            count = -1
            return count
          }
          // end stream if there were no results
          if (last == null) last = {}
        })
      ))
    })

    return pauseAfter(result, opts.delay)
  })
}

function get (obj, path) {
  if (!obj) return undefined
  if (typeof path === 'string') return obj[path]
  if (Array.isArray(path)) {
    for (var i = 0; obj && i < path.length; i++) {
      obj = obj[path[i]]
    }
    return obj
  }
}

function clone (obj) {
  var _obj = {}
  for (var k in obj) _obj[k] = obj[k]
  return _obj
}

function RemoveHook (fn) {
  return function (element) {
    return fn
  }
}

function pauseAfter (stream, delay) {
  if (!delay) {
    return stream
  } else {
    return pullCat([
      stream,
      wait(delay)
    ])
  }
}

function wait (delay) {
  return function (abort, cb) {
    if (abort) {
      cb(true)
    } else {
      setTimeout(() => {
        cb(true)
      }, delay)
    }
  }
}
