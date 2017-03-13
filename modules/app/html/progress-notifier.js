var {computed, when, h} = require('mutant')
var nest = require('depnest')
var sustained = require('../../../lib/sustained')

exports.gives = nest('app.html.progressNotifier')

exports.needs = nest({
  'progress.html.render': 'first',
  'progress.obs': {
    global: 'first',
    query: 'first',
    private: 'first'
  }
})

exports.create = function (api) {
  return nest('app.html.progressNotifier', function (id) {
    var progress = api.progress.obs.global()
    var indexing = computed([
      api.progress.obs.query().pending,
      api.progress.obs.private().pending
    ], Math.max)

    var maxQueryPending = 0

    var indexProgress = computed(indexing, (pending) => {
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
        return clamp((feeds - incomplete) / feeds)
      } else {
        return 1
      }
    })

    var hidden = computed([progress.incomplete, indexing], (incomplete, indexing) => {
      return incomplete < 5 && !indexing
    })

    return h('div.info', { hidden: sustained(hidden, 2000) }, [
      h('div.status', [
        h('Loading -small', [
          when(computed(progress.incomplete, (v) => v > 5),
            ['Downloading new messages', h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: downloadProgress })],
            when(indexing, [
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
