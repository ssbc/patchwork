var { h, when, map, Proxy, Struct, Value, computed } = require('mutant')
var nest = require('depnest')
var ref = require('ssb-ref')
var AnchorHook = require('../../../../lib/anchor-hook')

exports.needs = nest({
  'keys.sync.id': 'first',
  'feed.obs.thread': 'first',
  'message.sync.unbox': 'first',
  'message.sync.root': 'first',
  'message.html': {
    render: 'first',
    compose: 'first'
  },
  'sbot.async.get': 'first',
  'intl.sync.i18n': 'first',
  'message.html.missing': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', function (id) {
    if (!ref.isMsg(id)) return
    var loader = h('div', {className: 'Loading -large'})

    var result = Proxy(loader)
    var anchor = Value()
    var participants = Proxy([])

    var meta = Struct({
      type: 'post',
      root: Proxy(id),
      branch: Proxy(id),
      reply: Proxy(undefined),
      channel: Value(undefined),
      recps: Value(undefined)
    })

    var compose = api.message.html.compose({
      meta,
      isPrivate: when(meta.recps, true),
      shrink: false,
      participants,
      hooks: [
        AnchorHook('reply', anchor, (el) => el.focus())
      ],
      placeholder: when(meta.recps, i18n('Write a private reply'), i18n('Write a public reply'))
    })

    api.sbot.async.get(id, (err, value) => {
      if (err) {
        return result.set(h('PageHeading', [
          h('h1', i18n('Cannot load thread'))
        ]))
      }

      if (typeof value.content === 'string') {
        value = api.message.sync.unbox(value)
      }

      if (!value) {
        return result.set(h('PageHeading', [
          h('h1', i18n('Cannot display message.'))
        ]))
      }

      var rootMessage = {key: id, value}

      // Apply the recps of the original root message to all replies. What happens in private stays in private!
      meta.recps.set(value.content.recps)

      var root = api.message.sync.root(rootMessage) || id
      var isReply = id !== root
      var thread = api.feed.obs.thread(id, {branch: isReply})

      meta.channel.set(value.content.channel)
      meta.root.set(root || thread.rootId)

      // track message author for resolving missing messages and reply mentions
      meta.reply.set(computed(thread.messages, messages => {
        var result = {}
        var first = messages[0]
        var last = messages[messages.length - 1]

        if (first && first.value) {
          result[messages[0].key] = messages[0].value.author
        }

        if (last && last !== first && last.value) {
          result[last.key] = last.value.author
        }

        return result
      }))

      // if root thread, reply to last post
      meta.branch.set(isReply ? thread.branchId : thread.lastId)

      participants.set(computed(thread.messages, messages => {
        return messages.map(msg => msg && msg.value && msg.value.author)
      }))

      var container = h('Thread', [
        h('div.messages', [
          when(thread.branchId, h('a.full', {href: thread.rootId, anchor: id}, [i18n('View full thread')])),
          map(thread.messages, (msg) => {
            return computed([msg, thread.previousKey(msg)], (msg, previousId) => {
              return h('div', {
                hooks: [AnchorHook(msg.key, anchor, showContext)]
              }, [
                msg.key !== id ? api.message.html.missing(last(msg.value.content.branch), msg, rootMessage) : null,
                api.message.html.render(msg, {
                  pageId: id,
                  previousId,
                  includeForks: msg.key !== id,
                  includeReferences: true
                })
              ])
            })
          })
        ]),
        compose
      ])
      result.set(when(thread.sync, container, loader))
    })

    var view = h('div', {className: 'SplitView'}, [
      h('div.main', [
        result
      ])
    ])

    view.setAnchor = function (value) {
      anchor.set(value)
    }

    return view
  })
}

function showContext (element) {
  var scrollParent = getScrollParent(element)
  if (scrollParent) {
    // ensure context is visible
    scrollParent.scrollTop = Math.max(0, scrollParent.scrollTop - 100)
  }
}

function getScrollParent (element) {
  while (element.parentNode) {
    if (element.parentNode.scrollTop > 10 && isScroller(element.parentNode)) {
      return element.parentNode
    } else {
      element = element.parentNode
    }
  }
}

function isScroller (element) {
  var value = window.getComputedStyle(element)['overflow-y']
  return (value === 'auto' || value === 'scroll')
}

function last (array) {
  if (Array.isArray(array)) {
    return array[array.length - 1]
  } else {
    return array
  }
}
