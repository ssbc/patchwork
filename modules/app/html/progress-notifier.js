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

    var downloadProgress = computed([progress.feeds, progress.incompleteFeeds], (feeds, incomplete) => {
      if (feeds) {
        return clamp((feeds - incomplete) / feeds)
      } else {
        return 1
      }
    })

    var hidden = sustained(computed([progress.incompleteFeeds, indexing], (incomplete, indexing) => {
      return incomplete < 5 && !indexing
    }), 2000)

    // HACK: css animations take up WAY TO MUCH cpu, remove from dom when inactive
    var displaying = computed(sustained(hidden, 500, x => !x), hidden => !hidden)

    return h('div.info', { hidden }, [
      h('div.status', [
        when(displaying, h('Loading -small', [
          when(computed(progress.incompleteFeeds, (v) => v > 5),
            ['Downloading new messages', h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: downloadProgress })],
            when(indexing, [
              ['Indexing database', h('progress', { style: {'margin-left': '10px'}, min: 0, max: 1, value: indexProgress })]
            ], 'Scuttling...')
          )
        ]))
      ])
    ])
  })
}

function clamp (value) {
  return Math.min(1, Math.max(0, value)) || 0
}
