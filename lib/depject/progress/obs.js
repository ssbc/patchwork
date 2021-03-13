const nest = require('depnest')
const pull = require('pull-stream')
const { Struct, Dict, Value, computed, watch } = require('mutant')

exports.gives = nest({
  'progress.obs': [
    'global',
    'indexes',
    'plugins',
    'replicate',
    'migration',
    'peer'
  ]
})

exports.needs = nest({
  'sbot.obs.connection': 'first'
})

exports.create = function (api) {
  let syncStatus = null
  let progress = null
  let pluginProgress = null

  return nest({
    'progress.obs': {
      replicate () {
        load()
        return syncStatus
      },
      peer (id) {
        load()
        const result = computed(syncStatus, (status) => {
          return status.pendingPeers[id] || 0
        })
        return result
      },
      indexes () {
        load()
        return progress.indexes
      },
      plugins () {
        load()
        return pluginProgress.plugins
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
        pendingPeers: Dict({}, { fixedIndexing: true }),
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
    if (!pluginProgress) {
      pluginProgress = ProgressStatus(x => x.patchwork.progress(), {
        plugins: Struct({}),
      })
    }
  }

  function ProgressStatus (keyFn, attrs) {
    const progress = Struct(attrs || {
      pending: 0
    })

    watch(api.sbot.obs.connection, (sbot) => {
      if (sbot) {
        let source
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
