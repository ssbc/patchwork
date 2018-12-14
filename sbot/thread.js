const pull = require('pull-stream')
const pullCat = require('pull-cat')
const pullDefer = require('pull-defer')
const FilterBlocked = require('../lib/filter-blocked')

const getRoot = require('../lib/get-root')
const sort = require('ssb-sort')

exports.manifest = {
  read: 'source',
  sorted: 'source'
}

exports.init = function (ssb, config) {
  return { read, sorted }

  function sorted ({ types, live, old, dest, useBlocksFrom }) {
    var includeOld = old == null ? !live : old
    var includeLive = live == null ? !old : live
    var streams = []

    if (includeOld) {
      var sortedOldMessages = pullDefer.source()
      streams.push(sortedOldMessages)

      // collect all old messages, sort, then emit all
      pull(
        read({ old: true, live: false, dest }),
        pull.collect((err, msgs) => {
          if (err) return sortedOldMessages.abort(err)
          sortedOldMessages.resolve(pull.values(sort(msgs)))
        })
      )
    }

    if (includeLive && includeOld) {
      streams.push(
        pull.values([{ sync: true }])
      )
    }

    if (includeLive) {
      streams.push(read({ live: true, old: false, dest }))
    }

    return pull(
      pullCat(streams),
      pull.filter(msg => {
        if (msg.sync) {
          return true
        }
        var type = msg.value.content.type
        return !types || types.includes(type)
      }),
      FilterBlocked([ssb.id].concat(useBlocksFrom), {
        isBlocking: ssb.friends.isBlocking
      })
    )
  }

  function read ({ reverse = false, limit, types, live, old, dest }) {
    // TODO: properly handle truncation
    return pull(
      ssb.backlinks.read({
        private: true,
        awaitReady: false,
        reverse,
        live,
        old,
        index: 'DTA',
        query: [{ $filter: { dest } }]
      }),
      pull.filter(msg => {
        if (msg.sync) return msg
        var type = msg.value.content.type
        var root = getRoot(msg)
        return root === dest && (!types || types.includes(type))
      }),
      limit ? pull.take(limit) : pull.through()
    )
  }
}
