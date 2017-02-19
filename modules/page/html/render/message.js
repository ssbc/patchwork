var { h, when, map, Proxy, Struct, Value, computed } = require('mutant')
var nest = require('depnest')
var ref = require('ssb-ref')

exports.needs = nest({
  'keys.sync.id': 'first',
  'feed.obs.thread': 'first',
  'message.sync.unbox': 'first',
  'message.html': {
    render: 'first',
    compose: 'first'
  },
  'sbot.async.get': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (id) {
    if (!ref.isMsg(id)) return
    var loader = h('div', {className: 'Loading -large'})

    var result = Proxy(loader)

    var meta = Struct({
      type: 'post',
      root: Proxy(id),
      branch: Proxy(id),
      recps: Value(undefined)
    })

    var compose = api.message.html.compose({
      meta,
      shrink: false,
      placeholder: when(meta.recps, 'Write a private reply', 'Write a public reply')
    })

    api.sbot.async.get(id, (err, value) => {
      if (err) return result.set(h('div', {className: 'Error'}, ['Cannot load thead']))

      if (typeof value.content === 'string') {
        value = api.message.sync.unbox(value)
      }

      // what happens in private stays in private!
      meta.recps.set(value.content.recps)

      var isReply = !!value.content.root
      var thread = api.feed.obs.thread(id, {branch: isReply})

      meta.root.set(thread.rootId)

      // if root thread, reply to last post
      meta.branch.set(isReply ? thread.branchId : thread.lastId)

      var container = h('Thread', [
        when(thread.branchId, h('a.full', {href: thread.rootId}, ['View full thread'])),
        map(thread.messages, (msg) => {
          return computed([msg, thread.previousKey(msg)], (msg, previousId) => {
            return api.message.html.render(msg, {previousId, backlinks: true})
          })
        }),
        compose
      ])
      result.set(when(thread.sync, container, loader))
    })

    return h('div', {className: 'SplitView'}, [
      h('div.main', [
        result
      ])
    ])
  })
}
