var { h, when, watch, Proxy, Struct, Array: MutantArray, Value, computed, onceTrue } = require('mutant')
var nest = require('depnest')
var ref = require('ssb-ref')
var AnchorHook = require('../../../../lib/anchor-hook')
var sort = require('ssb-sort')
var pull = require('pull-stream')
var isBlog = require('scuttle-blog/isBlog')
var Blog = require('scuttle-blog')

exports.needs = nest({
  'keys.sync.id': 'first',
  'sbot.pull.stream': 'first',
  'message.obs.name': 'first',
  'message.sync.root': 'first',
  'message.html.render': 'first',
  'message.html.compose': 'first',
  'message.html.missing': 'first',
  'message.html.metas': 'first',
  'profile.html.person': 'first',
  'sbot.async.get': 'first',
  'intl.sync.i18n': 'first',
  'sbot.obs.connection': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', function (id) {
    if (!ref.isMsgLink(id)) return

    var link = ref.parseLink(id)
    var unbox = link.query && link.query.unbox
    id = link.link

    var loader = h('div', { className: 'Loading -large' })

    var result = Proxy(loader)
    var anchor = Value()
    var participants = Proxy([])
    var messageRefs = MutantArray()

    var yourId = api.keys.sync.id()

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
      return normalizedRecps(recps).includes(yourId)
    }, { idle: true })

    var compose = api.message.html.compose({
      meta,
      draftKey: id,
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

    get(id, { unbox }, (err, rootMessage) => {
      if (err) {
        return result.set(h('PageHeading', [
          h('h1', i18n('Cannot load thread'))
        ]))
      }

      if (!rootMessage) {
        return result.set(h('PageHeading', [
          h('h1', i18n('Cannot display message.'))
        ]))
      }

      var content = rootMessage.value.content
      messageRefs.push(getMessageRef(rootMessage))

      // Apply the recps of the original root message to all replies. What happens in private stays in private!
      meta.recps.set(content.recps)

      if (Array.isArray(content.recps)) {
        // use private recps if available
        participants.set(uniq(normalizedRecps(content.recps)))
      } else {
        // otherwise message authors
        participants.set(computed(messageRefs, messages => {
          return uniq(messages.map(msg => msg && msg.value && msg.value.author))
        }, { idle: true }))
      }

      var root = api.message.sync.root(rootMessage) || id
      var isFork = id !== root

      meta.channel.set(content.channel)
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

      var sync = false
      pull(
        api.sbot.pull.stream(sbot => sbot.patchwork.thread.sorted({
          live: true,
          old: true,
          dest: rootMessage.key,
          useBlocksFrom: rootMessage.value.author,
          types: ['post', 'about']
        })),
        pull.drain(msg => {
          if (msg.sync) {
            // actually add container to DOM when we get sync on thread
            sync = true
            result.set(container)
          } else {
            var element
            if (msg.blockedBy && msg.blockedBy.role === 'threadAuthor') {
              element = h('Message', [
                h('a.backlink', {
                  href: msg.key
                }, [
                  h('strong', [
                    api.profile.html.person(msg.value.author),
                    i18n(' replied but is blocked by '),
                    api.profile.html.person(msg.blockedBy.id),
                    ':'
                  ]), ' ',
                  api.message.obs.name(msg.key)
                ])
              ])
            } else {
              element = api.message.html.render(msg, {
                hooks: [UnreadClassHook(anchor, msg.key)],
                includeForks: msg.key !== id,
                includeReferences: true
              })
            }

            // mark messages as new if added in realtime
            if (sync && element && element.classList) {
              element.classList.add('-new')
              setTimeout(() => {
                // remove the new class after 30 seconds
                element.classList.remove('-new')
              }, 30 * 1e3)
            }

            messageRefs.push(getMessageRef(msg))
            messagesContainer.append(h('div', {
              hooks: [AnchorHook(msg.key, anchor, showContext)]
            }, [
              msg.key !== id ? api.message.html.missing(first(msg.value.content.branch), msg, rootMessage) : null,
              element
            ]))

            if (document.activeElement && document.activeElement.nodeName === 'TEXTAREA') {
              // ensure compose box remains on screen even after a post is added
              document.activeElement.scrollIntoViewIfNeeded()
            }
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

  function get (id, { unbox }, cb) {
    api.sbot.async.get({ id, private: true, unbox }, (err, value) => {
      if (err) return cb(err)
      var msg = { key: id, value }

      var me = api.keys.sync.id()
      onceTrue(api.sbot.obs.connection, sbot => {
        sbot.patchwork.contacts.isBlocking({ source: me, dest: value.author }, (err, blocking) => {
          if (err) throw err
          if (blocking) {
            cb(null, null)
          } else if (isBlog(msg)) {
            Blog(api.sbot.obs.connection).async.get(msg, (err, result) => {
              if (err) return cb(err)
              msg.body = result.body
              cb(null, msg)
            })
          } else {
            cb(null, msg)
          }
        })
      })
    })
  }
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

function normalizedRecps (recps) {
  return Array.isArray(recps) && recps.map(recp => {
    if (recp == null) return null
    if (typeof recp === 'string') {
      return recp
    }
    // if recp is mentions object
    if (typeof recp === 'object') {
      return recp.link
    }
  })
}

function uniq (array) {
  return Array.from(new Set(array))
}
