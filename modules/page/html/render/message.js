var { h, when, send, Value, Proxy, watch } = require('mutant')
var pull = require('pull-stream')
var nest = require('depnest')
var ref = require('ssb-ref')

exports.needs = nest({
  'keys.sync.id': 'first',
  'feed.html.thread': 'first',
  'message.html.render': 'first',
  'sbot.async.get': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (id) {
    if (!ref.isMsg(id)) return
    var loader = h('div', {className: 'Loading -large'})
    var result = Proxy(loader)

    api.sbot.async.get(id, (err, value) => {
      if (err) return result.set(h('div', {className: 'Error'}, ['Cannot load thead']))
      if (value.content.root) {
        result.set(h('div', {className: 'FeedEvent'}, [
          h('a.full', {href: value.content.root}, ['View full thread']),
          h('div.replies', [
            api.message.html.render({key: id, value})
          ])
        ]))
      } else {
        var thread = api.feed.html.thread(id)
        result.set(when(thread.sync, thread, loader))
      }
    })

    return h('div', {className: 'SplitView'}, [
      h('div.main', result)
    ])
  })
}
