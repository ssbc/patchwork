const pull = require('pull-stream')
const pullCat = require('pull-cat')
const pullDefer = require('pull-defer')
const FilterBlocked = require('../filter-blocked')

const getRoot = require('../get-root')
const sort = require('ssb-sort')

exports.manifest = {
  read: 'source',
  sorted: 'source'
}

exports.init = function (ssb) {
  return { read, sorted }

  function sorted ({ types, live, old, dest, useBlocksFrom }) {
    const includeOld = old == null ? !live : old
    const includeLive = live == null ? !old : live
    const streams = []

    if (includeOld) {
      const sortedOldMessages = pullDefer.source()
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
        const type = msg.value.content.type
        return !types || types.includes(type)
      }),
      FilterBlocked([ssb.id].concat(useBlocksFrom), {
        isBlocking: ssb.patchwork.contacts.isBlocking
      })
    )
  }

  function read ({ reverse = false, limit = null, types = null, live = null, old = null, dest = null }) {
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
        const type = msg.value.content.type
        const root = getRoot(msg)
        return root === dest && (!types || types.includes(type))
      }),
      limit ? pull.take(limit) : pull.through()
    )
  }
}
