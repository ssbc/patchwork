var nest = require('depnest')
var pull = require('pull-stream')
var {Struct, Dict, computed} = require('mutant')

exports.gives = nest({
  'progress.obs': ['global', 'peer', 'query']
})

exports.needs = nest({
  'sbot.pull.replicateProgress': 'first',
  'sbot.pull.queryProgress': 'first'
})

exports.create = function (api) {
  var syncStatus = null
  var queryProgress = null

  return nest({
    'progress.obs': {global, peer, query}
  })

  function global () {
    load()
    return syncStatus
  }

  function peer (id) {
    load()
    var result = computed(syncStatus, (status) => {
      return status.pendingPeers[id] || 0
    })
    return result
  }

  function query () {
    if (!queryProgress) {
      queryProgress = Struct({
        pending: 0
      })

      pull(
        api.sbot.pull.queryProgress(),
        pull.drain((event) => {
          queryProgress.set(event)
        })
      )
    }
    return queryProgress
  }

  function load () {
    if (!syncStatus) {
      syncStatus = Struct({
        incomplete: 0,
        pendingCount: 0,
        pendingPeers: Dict({}, {fixedIndexing: true}),
        feeds: null,
        rate: 0
      })

      pull(
        api.sbot.pull.replicateProgress(),
        pull.drain((event) => {
          if (!event.sync) {
            syncStatus.set(event)
          }
        })
      )
    }
  }
}

function Peer (id) {
  return Struct({
    type: 'peer',
    id: id,
    pending: 0
  })
}

function Feed (id) {
  return Struct({
    type: 'feed',
    id: id,
    available: 0,
    local: 0
  })
}
