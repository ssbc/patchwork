var {computed, when, h, throttle} = require('mutant')
var nest = require('depnest')
var sustained = require('../../../lib/sustained')

exports.gives = nest('app.html.progressNotifier')

exports.needs = nest({
  'progress.html.render': 'first',
  'progress.obs.global': 'first',
  'progress.obs.query': 'first'
})

exports.create = function (api) {
  return nest('app.html.progressNotifier', function (id) {
    var progress = api.progress.obs.global()
    var queryProgress = api.progress.obs.query()

    var maxQueryPending = 0

    var indexProgress = computed([queryProgress.pending], (pending) => {
      if (pending === 0 || pending > maxQueryPending) {
        maxQueryPending = pending
      }
      if (pending === 0) {
        return 1
      } else {
        return (maxQueryPending - pending) / maxQueryPending
      }
    })

    var downloadProgress = computed([progress.feeds, progress.incomplete], (feeds, incomplete) => {
      if (feeds) {
        return clamp((incomplete - feeds) / feeds)
      } else {
        return 1
      }
    })

    var hidden = computed([progress.incomplete, queryProgress.pending], (incomplete, indexing) => {
      return incomplete <= 10 && indexing <= 10
    })

    var hasDownloadProgress = computed([progress.feeds, progress.incomplete], (feeds, incomplete) => {
      if (feeds) {
        return incomplete > 10
      }
    })

    return h('div.info', { hidden: sustained(hidden, 1000) }, [
      h('div.status', [
        h('Loading -small', [
          when(hasDownloadProgress,
            ['Downloading new messages', h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: downloadProgress })],
            when(queryProgress.pending, [
              ['Indexing database', h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: indexProgress })]
            ], 'Scuttling...')
          )
        ])
      ])
    ])
  })
}

function clamp (value) {
  return Math.min(1, Math.max(0, value)) || 0
}
