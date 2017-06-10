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

    var max = 0
    var feeds = computed([api.progress.obs.global().feeds, progress], function (feeds, progress) {
      // handle when feeds hasn't finished loading yet, take max from progress
      if (progress) {
        max = Math.max(max, feeds || 0, progress)
      } else {
        max = feeds
      }
      return max
    })

    var value = computed([progress, feeds], (pending, feeds) => {
      return (feeds - pending) / feeds
    })

    return api.progress.html.render(value, when(progress, '-pending'))
  })
}
