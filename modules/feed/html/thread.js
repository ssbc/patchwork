var { h, computed, map } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'feed.obs.thread': 'first',
  'message.html.render': 'first'
})

exports.gives = nest('feed.html.thread')

exports.create = function (api) {
  return nest('feed.html.thread', function (rootId) {
    var thread = api.feed.obs.thread(rootId)

    var container = h('div', {className: 'Thread'}, [
      map(thread.messages, (msg) => {
        return computed([msg, thread.previousKey(msg)], (msg, previousId) => {
          return api.message.html.render(msg, {previousId})
        })
      })
    ])

    container.sync = thread.sync
    return container
  })
}
