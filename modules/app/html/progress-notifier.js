var {computed, when, h, throttle} = require('mutant')
var nest = require('depnest')

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

    var hidden = computed([progress.incomplete, progress.feeds, queryProgress.pending], (incomplete, feeds, indexing) => {
      return incomplete <= 5 && !indexing && feeds
    })

    var hasDownloadProgress = computed([progress.feeds, progress.incomplete], (feeds, incomplete) => {
      if (feeds) {
        return incomplete > 5
      }
    })

    return h('div.info', { hidden: throttle(hidden, 5000) }, [
      h('div.status', [
        h('Loading -small', [
          when(hasDownloadProgress,
            ['Downloading new messages', h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: downloadProgress })],
            when(queryProgress.pending, [
              ['Indexing database', h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: indexProgress })]
            ], 'Checking for changes...')
          )
        ])
      ])
    ])
  })
}

function clamp (value) {
  return Math.min(1, Math.max(0, value)) || 0
}
