var SortedArray = require('sorted-array-functions')
var Value = require('@mmckegg/mutant/value')
var h = require('@mmckegg/mutant/html-element')
var when = require('@mmckegg/mutant/when')
var computed = require('@mmckegg/mutant/computed')
var MutantArray = require('@mmckegg/mutant/array')
var pullPushable = require('pull-pushable')
var pullNext = require('pull-next')
var Scroller = require('../lib/pull-scroll')
var Abortable = require('pull-abortable')

var m = require('../lib/h')

var pull = require('pull-stream')

var plugs = require('patchbay/plugs')
var message_render = plugs.first(exports.message_render = [])
var message_compose = plugs.first(exports.message_compose = [])
var sbot_log = plugs.first(exports.sbot_log = [])
var avatar_name = plugs.first(exports.avatar_name = [])
var avatar_link = plugs.first(exports.avatar_link = [])
var message_link = plugs.first(exports.message_link = [])

exports.screen_view = function (path, sbot) {
  if (path === '/public') {
    var sync = Value(false)
    var updates = Value(0)

    var updateLoader = m('a.loader', {
      href: '#',
      'ev-click': refresh
    }, [
      'Show ',
      h('strong', [updates]), ' ',
      when(computed(updates, a => a === 1), 'update', 'updates')
    ])

    var content = h('div.column.scroller__content')

    var scrollElement = h('div.column.scroller', {
      style: {
        'overflow': 'auto'
      }
    }, [
      h('div.scroller__wrapper', [
        message_compose({type: 'post'}, {placeholder: 'Write a public message'}),
        content
      ])
    ])

    setTimeout(refresh, 10)

    pull(
      sbot_log({old: false}),
      pull.drain((item) => {
        if (!item.value.content.type === 'vote') {
          updates.set(updates() + 1)
        }
      })
    )

    var abortLastFeed = null

    return MutantArray([
      when(updates, updateLoader),
      when(sync, scrollElement, m('Loading -large'))
    ])
  }

  // scoped
  function refresh () {
    if (abortLastFeed) {
      abortLastFeed()
    }
    updates.set(0)
    sync.set(false)
    content.innerHTML = ''

    var abortable = Abortable()
    abortLastFeed = abortable.abort

    pull(
      FeedSummary(sbot_log, 100, () => {
        sync.set(true)
      }),
      abortable,
      Scroller(scrollElement, content, renderItem, false, false)
    )
  }
}

function FeedSummary (stream, windowSize, cb) {
  var last = null
  var returned = false
  return pullNext(() => {
    var next = {reverse: true, limit: windowSize, live: false}
    if (last) {
      next.lt = last.timestamp
    }
    var pushable = pullPushable()
    pull(
      sbot_log(next),
      pull.collect((err, values) => {
        if (err) throw err
        groupMessages(values).forEach(v => pushable.push(v))
        last = values[values.length - 1]
        pushable.end()
        if (!returned) cb && cb()
        returned = true
      })
    )
    return pushable
  })
}

function renderItem (item) {
  if (item.type === 'message') {
    var meta = null
    var replies = item.replies.slice(-3).map(message_render)
    var renderedMessage = item.message ? message_render(item.message) : null
    if (renderedMessage) {
      if (item.lastUpdateType === 'reply' && item.repliesFrom.size) {
        meta = m('div.meta', [
          manyPeople(item.repliesFrom), ' replied'
        ])
      } else if (item.lastUpdateType === 'dig' && item.digs.size) {
        meta = m('div.meta', [
          manyPeople(item.digs), ' dug this message'
        ])
      }

      return m('FeedEvent', [
        meta,
        renderedMessage,
        when(replies.length, [
          when(item.replies.length > replies.length,
            m('a.full', {href: `#${item.messageId}`}, ['View full thread'])
          ),
          m('div.replies', replies)
        ])
      ])
    } else {
      if (item.lastUpdateType === 'reply' && item.repliesFrom.size) {
        meta = m('div.meta', [
          manyPeople(item.repliesFrom), ' replied to ', message_link(item.messageId)
        ])
      } else if (item.lastUpdateType === 'dig' && item.digs.size) {
        meta = m('div.meta', [
          manyPeople(item.digs), ' dug ', message_link(item.messageId)
        ])
      }

      if (meta || replies.length) {
        return m('FeedEvent', [
          meta, m('div.replies', replies)
        ])
      }
    }
  } else if (item.type === 'follow') {
    return m('FeedEvent -follow', [
      m('div.meta', [
        person(item.id), ' followed ', manyPeople(item.contacts)
      ])
    ])
  }

  return h('div')
}

function person (id) {
  return avatar_link(id, avatar_name(id), '')
}

function manyPeople (ids) {
  ids = Array.from(ids)
  var featuredIds = ids.slice(-3).reverse()

  if (ids.length) {
    if (ids.length > 3) {
      return [
        person(featuredIds[0]), ', ',
        person(featuredIds[1]),
        ' and ', ids.length - 2, ' others'
      ]
    } else if (ids.length === 3) {
      return [
        person(featuredIds[0]), ', ',
        person(featuredIds[1]), ' and ',
        person(featuredIds[2])
      ]
    } else if (ids.length === 2) {
      return [
        person(featuredIds[0]), ' and ',
        person(featuredIds[1])
      ]
    } else {
      return person(featuredIds[0])
    }
  }
}

function groupMessages (messages) {
  var follows = {}
  var messageUpdates = {}
  reverseForEach(messages, function (msg) {
    var c = msg.value.content
    if (c.type === 'contact') {
      updateContact(msg, follows)
    } else if (c.type === 'vote') {
      if (c.vote && c.vote.link) {
        // only show digs of posts added in the current window
        // and only for the main post
        const group = messageUpdates[c.vote.link]
        if (group) {
          if (c.vote.value > 0) {
            group.lastUpdateType = 'dig'
            group.digs.add(msg.value.author)
            group.updated = msg.timestamp
          } else {
            group.digs.delete(msg.value.author)
            if (group.lastUpdateType === 'dig' && !group.digs.size && !group.replies.length) {
              group.lastUpdateType = 'reply'
            }
          }
        }
      }
    } else {
      if (c.root) {
        const group = ensureMessage(c.root, messageUpdates)
        group.lastUpdateType = 'reply'
        group.repliesFrom.add(msg.value.author)
        group.replies.push(msg)
        group.updated = msg.timestamp
      } else {
        const group = ensureMessage(msg.key, messageUpdates)
        group.lastUpdateType = 'post'
        group.updated = msg.timestamp
        group.message = msg
      }
    }
  })

  var result = []
  Object.keys(follows).forEach((key) => {
    SortedArray.add(result, follows[key], compareUpdated)
  })
  Object.keys(messageUpdates).forEach((key) => {
    SortedArray.add(result, messageUpdates[key], compareUpdated)
  })
  return result
}

function compareUpdated (a, b) {
  return b.updated - a.updated
}

function reverseForEach (items, fn) {
  var i = items.length - 1
  var start = Date.now()
  nextBatch()

  function nextBatch () {
    while (i >= 0 && Date.now() - start < 10) {
      fn(items[i], i)
      i -= 1
    }

    if (i > 0) {
      setImmediate(nextBatch)
    }
  }
}

function updateContact (msg, groups) {
  var c = msg.value.content
  var id = msg.value.author
  var group = groups[id]
  if (c.following) {
    if (!group) {
      group = groups[id] = {
        type: 'follow',
        lastUpdateType: null,
        contacts: new Set(),
        updated: 0,
        id: id
      }
    }
    group.contacts.add(c.contact)
    group.updated = msg.timestamp
  } else {
    if (group) {
      group.contacts.delete(c.contact)
      if (!group.contacts.size) {
        delete groups[id]
      }
    }
  }
}

function ensureMessage (id, groups) {
  var group = groups[id]
  if (!group) {
    group = groups[id] = {
      type: 'message',
      repliesFrom: new Set(),
      replies: [],
      message: null,
      messageId: id,
      digs: new Set(),
      updated: 0
    }
  }
  return group
}
