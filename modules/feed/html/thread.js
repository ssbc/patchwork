var { h, computed, map, when } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'feed.obs.thread': 'first',
  'message.html.render': 'first'
})

exports.gives = nest('feed.html.thread')

exports.create = function (api) {
  return nest('feed.html.thread', function (rootId, {append, branch}) {
    var thread = api.feed.obs.thread(rootId, {branch})

    var container = h('Thread', [
      when(thread.branchId, h('a.full', {href: thread.rootId}, ['View full thread'])),
      map(thread.messages, (msg) => {
        return computed([msg, thread.previousKey(msg)], (msg, previousId) => {
          return api.message.html.render(msg, {previousId})
        })
      }),
      append
    ])

    container.sync = thread.sync
    return container
  })
}
