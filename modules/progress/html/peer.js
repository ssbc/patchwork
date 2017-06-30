var {computed, when} = require('mutant')
var nest = require('depnest')

exports.gives = nest('progress.html.peer')

exports.needs = nest({
  'progress.html.render': 'first',
  'progress.obs.peer': 'first',
  'progress.obs.replicate': 'first'
})

exports.create = function (api) {
  return nest('progress.html.peer', function (id) {
    var progress = api.progress.obs.peer(id)
    var feeds = api.progress.obs.replicate().feeds
    var value = computed([progress, feeds], (pending, feeds) => {
      return (feeds - pending) / feeds
    })

    return api.progress.html.render(value, when(progress, '-pending'))
  })
}
