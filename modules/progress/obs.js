var nest = require('depnest')
var pull = require('pull-stream')
var {Struct, Dict, computed, watch} = require('mutant')

exports.gives = nest({
  'progress.obs': [
    'global',
    'peer',
    'query',
    'private']
})

exports.needs = nest({
  'sbot.obs.connection': 'first'
})

exports.create = function (api) {
  var syncStatus = null
  var queryProgress = null
  var privateProgress = null

  return nest({
    'progress.obs': {
      global () {
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
      query () {
        if (!queryProgress) {
          queryProgress = ProgressStatus(x => x.query.progress)
        }
        return queryProgress
      },
      private () {
        if (!privateProgress) {
          privateProgress = ProgressStatus(x => x.private.progress)
        }
        return privateProgress
      }
    }
  })

  function load () {
    if (!syncStatus) {
      syncStatus = ProgressStatus(x => x.replicate.changes, {
        incompleteFeeds: 0,
        pendingPeers: Dict({}, {fixedIndexing: true}),
        feeds: null,
        rate: 0
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
            source(),
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

