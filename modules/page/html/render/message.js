var { h, when, watch, Proxy, Struct, Array: MutantArray, Value, computed } = require('mutant')
var nest = require('depnest')
var ref = require('ssb-ref')
var AnchorHook = require('../../../../lib/anchor-hook')
var sort = require('ssb-sort')
var pull = require('pull-stream')

exports.needs = nest({
  'keys.sync.id': 'first',
  'feed.obs.thread': 'first',
  'sbot.pull.stream': 'first',
  'message.sync.unbox': 'first',
  'message.html.layout': 'first',
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
    if (!ref.isMsgLink(id)) return

    var link = ref.parseLink(id)
    var params = { id: link.link }
    if (link.query && link.query.unbox) {
      params.private = true
      params.unbox = link.query.unbox
    }

    var loader = h('div', { className: 'Loading -large' })

    var result = Proxy(loader)
    var anchor = Value()
    var participants = Proxy([])
    var messageRefs = MutantArray()

    var meta = Struct({
      type: 'post',
      root: Proxy(link.link),
      fork: Proxy(undefined),
      branch: Proxy(link.link),
      reply: Proxy(undefined),
      channel: Value(undefined),
      recps: Value(undefined)
    })

    var isRecipient = computed(meta.recps, recps => {
      if (recps == null) return true // not a private message
      return Array.isArray(recps) && recps.some(recp => {
        if (recp == null) return false
        if (typeof recp === 'string') {
          return recp === api.keys.sync.id()
        }
        // if recp is mentions object
        if (typeof recp === 'object') {
          return recp.link === api.keys.sync.id()
        }
      })
    }, { idle: true })

    var compose = api.message.html.compose({
      meta,
      isPrivate: when(meta.recps, true),
      shrink: false,
      participants,
      hooks: [
        AnchorHook('reply', anchor, (el) => el.focus())
      ],
      placeholder: when(meta.recps,
        i18n('Write a private reply'),
        when(meta.fork, i18n('Write a public reply in sub-thread (fork)'), i18n('Write a public reply'))
      )
    })

    api.sbot.async.get(params, (err, value) => {
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

      var rootMessage = { key: id, value }

      messageRefs.push(getMessageRef(rootMessage))

      // Apply the recps of the original root message to all replies. What happens in private stays in private!
      meta.recps.set(value.content.recps)

      var root = api.message.sync.root(rootMessage) || id
      var isFork = id !== root

      meta.channel.set(value.content.channel)
      meta.root.set(id)

      // if we are viewing a message with a root directly, then direct replies fork the original thread
      meta.fork.set(isFork ? root : undefined)

      // track message author for resolving missing messages and reply mentions
      meta.reply.set(computed(messageRefs, messages => {
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
      }, { idle: true }))

      // set message heads
      meta.branch.set(computed(messageRefs, messages => {
        var branches = sort.heads(messages)
        if (branches.length <= 1) {
          branches = branches[0]
        }
        return branches
      }, { idle: true }))

      participants.set(computed(messageRefs, messages => {
        return messages.map(msg => msg && msg.value && msg.value.author)
      }, { idle: true }))

      var rootMessageElement = api.message.html.render(rootMessage, {
        forkedFrom: rootMessage.root,
        pageId: rootMessage.key,
        hooks: [UnreadClassHook(anchor, rootMessage.key)],
        includeForks: false,
        includeReferences: true
      })

      // handle display unknown message types as root
      if (!rootMessageElement) {
        result.set(h('Thread', [
          isFork ? h('a.full', { href: root, anchor: id }, [i18n('View parent thread')]) : null,
          h('div.messages', [
            api.message.html.render(rootMessage, {
              renderUnknown: true
            })
          ])
        ]))

        return
      }

      var messagesContainer = h('div.messages', [rootMessageElement])

      var container = h('Thread', [
        isFork ? h('a.full', { href: root, anchor: id }, [i18n('View parent thread')]) : null,
        messagesContainer,
        when(isRecipient, compose)
      ])

      pull(
        api.sbot.pull.stream(sbot => sbot.patchwork.thread.sorted({
          live: true,
          old: true,
          dest: rootMessage.key,
          types: ['post', 'about']
        })),
        pull.drain(msg => {
          if (msg.sync) {
            // actually add container to DOM when we get sync on thread
            result.set(container)
          } else {
            messageRefs.push(getMessageRef(msg))
            messagesContainer.append(h('div', {
              hooks: [AnchorHook(msg.key, anchor, showContext)]
            }, [
              msg.key !== id ? api.message.html.missing(first(msg.value.content.branch), msg, rootMessage) : null,
              api.message.html.render(msg, {
                hooks: [UnreadClassHook(anchor, msg.key)],
                includeForks: msg.key !== id,
                includeReferences: true
              })
            ]))
          }
        })
      )
    })

    var view = h('div', { className: 'SplitView' }, [
      h('div.main', {
        intersectionBindingViewport: { rootMargin: '1000px' }
      }, [
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

function first (array) {
  if (Array.isArray(array)) {
    return array[0]
  } else {
    return array
  }
}

function getMessageRef (msg) {
  // only store structure meta data, not full message content to ease memory usage
  if (msg.value && msg.value.content) {
    return {
      key: msg.key,
      value: {
        author: msg.value.author,
        content: {
          root: msg.value.content.root,
          branch: msg.value.content.branch
        }
      }
    }
  }
}

function UnreadClassHook (anchor, msgId) {
  return function (element) {
    return watch(anchor, (current) => {
      if (current && current.unread && current.unread.includes(msgId)) {
        element.classList.add('-unread')
      } else {
        element.classList.remove('-unread')
      }
    })
  }
}
