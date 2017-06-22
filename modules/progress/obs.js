var nest = require('depnest')
var pull = require('pull-stream')
var {Struct, Dict, Value, computed, watch, onceTrue} = require('mutant')

exports.gives = nest({
  'progress.obs': [
    'global',
    'indexes',
    'replicate',
    'migration',
    'peer'
  ]
})

exports.needs = nest({
  'sbot.obs.connection': 'first'
})

exports.create = function (api) {
  var syncStatus = null
  var progress = null

  setInterval(() => {
    onceTrue(api.sbot.obs.connection(), sbot => {
      sbot.progress
    })
  }, 1000)

  return nest({
    'progress.obs': {
      replicate () {
        load()
        return syncStatus
      },
      peer (id) {
        load()
        var result = computed(syncStatus, (status) => {
          return status.pendingPeers[id] || 0
        })
        return result
      },
      indexes () {
        load()
        return progress.indexes
      },
      migration () {
        load()
        return progress.migration
      },
      global () {
        load()
        return progress
      }
    }
  })

  function load () {
    if (!syncStatus) {
      syncStatus = ProgressStatus(x => x.replicate.changes(), {
        incompleteFeeds: 0,
        pendingPeers: Dict({}, {fixedIndexing: true}),
        feeds: null,
        rate: 0
      })
    }
    if (!progress) {
      progress = ProgressStatus(x => x.patchwork.progress(), {
        indexes: Status(),
        migration: Status()
      })
    }
  }

  function ProgressStatus (keyFn, attrs) {
    var progress = Struct(attrs || {
      pending: 0
    })

    watch(api.sbot.obs.connection, (sbot) => {
      if (sbot) {
        var source
        try {
          source = keyFn(sbot)
        } catch (err) {
          progress.set(err)
          return progress
        }
        if (source) {
          pull(
            source,
            pull.drain((event) => {
              progress.set(event)
            })
          )
        }
      }
    })

    return progress
  }
}

function Status () {
  return Struct({
    start: Value(),
    current: Value(),
    target: Value()
  })
}
