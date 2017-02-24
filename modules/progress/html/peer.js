var {computed, when} = require('mutant')
var nest = require('depnest')

exports.gives = nest('progress.html.peer')

exports.needs = nest({
  'progress.html.render': 'first',
  'progress.obs.peer': 'first',
  'progress.obs.global': 'first'
})

exports.create = function (api) {
  return nest('progress.html.peer', function (id) {
    var progress = api.progress.obs.peer(id)
    var feeds = api.progress.obs.global().feeds

    var value = computed([progress, feeds], (pending, feeds) => {
      return (feeds - pending) / feeds
    })

    return when(progress, api.progress.html.render(value))
  })
}
