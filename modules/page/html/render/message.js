var { h, when, Proxy, Struct, Value } = require('mutant')
var nest = require('depnest')
var ref = require('ssb-ref')

exports.needs = nest({
  'keys.sync.id': 'first',
  'feed.html.thread': 'first',
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
      root: id,
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

      var isReply = !!value.content.root
      var thread = api.feed.html.thread(id, {
        branch: isReply,
        append: compose
      })

      if (!isReply) {
        meta.branch.set(thread.lastId)
      }

      meta.recps.set(value.content.recps)
      result.set(when(thread.sync, thread, loader))
    })

    return h('div', {className: 'SplitView'}, [
      h('div.main', [
        result
      ])
    ])
  })
}
