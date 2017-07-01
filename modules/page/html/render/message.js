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
  return nest('page.html.render', function (id) {
    if (!ref.isMsg(id)) return
    var loader = h('div', {className: 'Loading -large'})

    var result = Proxy(loader)

    var meta = Struct({
      type: 'post',
      root: Proxy(id),
      branch: Proxy(id),
      channel: Value(undefined),
      recps: Value(undefined)
    })

    var compose = api.message.html.compose({
      meta,
      shrink: false,
      placeholder: when(meta.recps, 'Write a private reply', 'Write a public reply')
    })

    api.sbot.async.get(id, (err, value) => {
      if (err) {
        return result.set(h('PageHeading', [
          h('h1', 'Cannot load thread. Root message missing.')
        ]))
      }

      if (typeof value.content === 'string') {
        value = api.message.sync.unbox(value)
      }

      if (!value) {
        return result.set(h('PageHeading', [
          h('h1', 'Cannot display message.')
        ]))
      }

      // what happens in private stays in private!
      meta.recps.set(value.content.recps)

      var isReply = !!value.content.root
      var thread = api.feed.obs.thread(id, {branch: isReply})

      meta.channel.set(value.content.channel)
      meta.root.set(value.content.root || thread.rootId)

      // if root thread, reply to last post
      meta.branch.set(isReply ? thread.branchId : thread.lastId)

      var container = h('Thread', [
        h('div.messages', [
          when(thread.branchId, h('a.full', {href: thread.rootId}, ['View full thread'])),
          map(thread.messages, (msg) => {
            return computed([msg, thread.previousKey(msg)], (msg, previousId) => {
              return api.message.html.render(msg, {pageId: id, previousId, includeReferences: true})
            })
          }, {
            maxTime: 5,
            idle: true
          })
        ]),
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
