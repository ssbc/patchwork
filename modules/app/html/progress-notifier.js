var {computed, when, h, Value} = require('mutant')
var nest = require('depnest')
var sustained = require('../../../lib/sustained')
var pull = require('pull-stream')

exports.gives = nest('app.html.progressNotifier')

exports.needs = nest({
  'sbot.pull.stream': 'first',
  'progress.html.render': 'first',
  'progress.obs': {
    indexes: 'first',
    replicate: 'first',
    migration: 'first'
  }
})

exports.create = function (api) {
  return nest('app.html.progressNotifier', function (id) {
    var replicateProgress = api.progress.obs.replicate()
    var indexes = api.progress.obs.indexes()
    var migration = api.progress.obs.migration()
    var waiting = Waiting()

    var pending = computed(indexes, (progress) => progress.target - progress.current || 0)
    var pendingMigration = computed(migration, (progress) => progress.target - progress.current || 0)

    var indexProgress = computed(indexes, calcProgress)
    var migrationProgress = computed(migration, calcProgress)

    var downloadProgress = computed([replicateProgress.feeds, replicateProgress.incompleteFeeds], (feeds, incomplete) => {
      if (feeds) {
        return clamp((feeds - incomplete) / feeds)
      } else {
        return 1
      }
    })

    var hidden = sustained(computed([waiting, replicateProgress.incompleteFeeds, pending, pendingMigration], (waiting, incomplete, pending, pendingMigration) => {
      return !waiting && incomplete < 5 && !pending && !pendingMigration
    }), 2000)

    // HACK: css animations take up WAY TO MUCH cpu, remove from dom when inactive
    var displaying = computed(sustained(hidden, 500, x => !x), hidden => !hidden)

    return h('div.info', { hidden }, [
      h('div.status', [
        when(displaying, h('Loading -small', [
          when(waiting, 'Waiting for Scuttlebot...',
            when(pendingMigration,
              [h('span.info', 'Upgrading database'), h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: migrationProgress })],
              when(computed(replicateProgress.incompleteFeeds, (v) => v > 5),
                [h('span.info', 'Downloading new messages'), h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: downloadProgress })],
                when(pending, [
                  [h('span.info', 'Indexing database'), h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: indexProgress })]
                ], 'Scuttling...')
              )
            )
          )
        ]))
      ])
    ])
  })

  // scoped

  function Waiting () {
    var waiting = Value()
    var lastTick = Date.now()

    pull(
      api.sbot.pull.stream(sbot => sbot.patchwork.heartbeat()),
      pull.drain((tick) => {
        lastTick = Date.now()
        waiting.set(false)
      })
    )

    setInterval(function () {
      if (lastTick < Date.now() - 1000) {
        waiting.set(true)
      }
    }, 1000)

    return waiting
  }
}

function clamp (value) {
  return Math.min(1, Math.max(0, value)) || 0
}

function calcProgress (progress) {
  var range = progress.target - progress.start
  if (range) {
    return (progress.current - progress.start) / range
  } else {
    return 1
  }
}
