const { computed, when } = require('mutant')
const nest = require('depnest')
const renderProgress = require('../../../progress/html/render')

exports.gives = nest('progress.html.peer')

exports.needs = nest({
  'progress.obs.peer': 'first',
  'progress.obs.replicate': 'first'
})

exports.create = function (api) {
  return nest('progress.html.peer', function (id) {
    const progress = api.progress.obs.peer(id)
    const feeds = api.progress.obs.replicate().feeds
    const value = computed([progress, feeds], (pending, feeds) => {
      return (feeds - pending) / feeds
    })

    return renderProgress(value, when(progress, '-pending'))
  })
}
