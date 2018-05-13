var {computed, when, h, Value} = require('mutant')
var nest = require('depnest')
var sustained = require('../../../lib/sustained')
const pull = require('pull-stream')

exports.gives = nest('app.html.progressNotifier')

exports.needs = nest({
  'sbot.pull.stream': 'first',
  'progress.html.render': 'first',
  'progress.obs': {
    indexes: 'first',
    replicate: 'first',
    migration: 'first'
  },
  'intl.sync.i18n': 'first'
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('app.html.progressNotifier', function (id) {
    var replicateProgress = api.progress.obs.replicate()
    var indexes = api.progress.obs.indexes()
    var migration = api.progress.obs.migration()
    var waiting = Waiting(replicateProgress)

    var pending = computed(indexes, (progress) => progress.target - progress.current || 0)
    var pendingMigration = computed(migration, (progress) => progress.target - progress.current || 0)

    var indexProgress = computed(indexes, calcProgress)
    var migrationProgress = computed(migration, calcProgress)

    var incompleteFeedsFrom = 0

    var downloadProgress = computed([replicateProgress.feeds, replicateProgress.incompleteFeeds], (feeds, incomplete) => {
      if (incomplete > incompleteFeedsFrom) {
        incompleteFeedsFrom = incomplete
      } else if (incomplete === 0) {
        incompleteFeedsFrom = 0
      }
      if (feeds && incomplete) {
        return clamp((feeds - incomplete) / incompleteFeedsFrom)
      } else {
        return 1
      }
    })

    var hidden = sustained(computed([waiting, downloadProgress, pending, pendingMigration], (waiting, downloadProgress, pending, pendingMigration) => {
      return !waiting && downloadProgress === 1 && !pending && !pendingMigration
    }), 500)

    // HACK: css animations take up WAY TO MUCH cpu, remove from dom when inactive
    var displaying = computed(sustained(hidden, 500, x => !x), hidden => !hidden)

    return h('div.info', { hidden }, [
      h('div.status', [
        when(displaying, h('Loading -small', [
          when(pendingMigration,
            [h('span.info', i18n('Upgrading database')), h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: migrationProgress })],
            when(computed(downloadProgress, (v) => v < 1),
              [h('span.info', i18n('Downloading new messages')), h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: downloadProgress })],
              when(pending, [
                [h('span.info', i18n('Indexing database')), h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: indexProgress })]
              ], i18n('Scuttling...'))
            )
          )
        ]))
      ])
    ])
  })

  // scoped

  function Waiting (progress) {
    var waiting = Value()
    var lastTick = Date.now()

    progress && progress(update)

    pull(
      api.sbot.pull.stream(sbot => sbot.patchwork.heartbeat()),
      pull.drain(update)
    )

    setInterval(function () {
      if (lastTick < Date.now() - 1000) {
        waiting.set(true)
      }
    }, 1000)

    return waiting

    // scoped

    function update () {
      lastTick = Date.now()
      waiting.set(false)
    }
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
