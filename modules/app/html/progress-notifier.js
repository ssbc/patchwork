var {computed, when, h} = require('mutant')
var nest = require('depnest')
var sustained = require('../../../lib/sustained')

exports.gives = nest('app.html.progressNotifier')

exports.needs = nest({
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

    var hidden = sustained(computed([replicateProgress.incompleteFeeds, pending, pendingMigration], (incomplete, pending, pendingMigration) => {
      return incomplete < 5 && !pending && !pendingMigration
    }), 2000)

    // HACK: css animations take up WAY TO MUCH cpu, remove from dom when inactive
    var displaying = computed(sustained(hidden, 500, x => !x), hidden => !hidden)

    return h('div.info', { hidden }, [
      h('div.status', [
        when(displaying, h('Loading -small', [
          when(pendingMigration,
            [h('span.info', 'Upgrading database'), h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: migrationProgress })],
            when(computed(replicateProgress.incompleteFeeds, (v) => v > 5),
              [h('span.info', 'Downloading new messages'), h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: downloadProgress })],
              when(pending, [
                [h('span.info', 'Indexing database'), h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: indexProgress })]
              ], 'Scuttling...')
            )
          )
        ]))
      ])
    ])
  })
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
