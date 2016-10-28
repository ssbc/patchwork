var SortedArray = require('sorted-array-functions')
var Value = require('@mmckegg/mutant/value')
var MutantMap = require('@mmckegg/mutant/map')
var h = require('@mmckegg/mutant/html-element')
var when = require('@mmckegg/mutant/when')
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
    var events = Value([])
    var updates = Value(0)

    var updateLoader = m('a', {
      href: '#',
      style: {
        'padding': '10px',
        'display': 'block',
        'background': '#d6e4ec',
        'border': '1px solid #bbc9d2',
        'text-align': 'center'
      },
      'ev-click': refresh
    }, [ 'Load ', h('strong', [updates]), ' update(s)' ])

    var content = h('div.column.scroller__content', [
      when(updates, updateLoader),
      MutantMap(events, (group) => {
        if (group.type === 'message') {
          var meta = null
          var replies = group.replies.slice(-3).map(message_render)
          var renderedMessage = group.message ? message_render(group.message) : null
          if (renderedMessage) {
            if (group.lastUpdateType === 'reply') {
              meta = m('div.meta', [
                manyPeople(group.repliesFrom), ' replied'
              ])
            } else if (group.lastUpdateType === 'dig') {
              meta = m('div.meta', [
                manyPeople(group.digs), ' dug this message'
              ])
            }

            return m('FeedEvent', [
              meta,
              renderedMessage,
              when(replies.length, [
                when(group.replies.length > replies.length,
                  m('a.full', {href: `#${group.messageId}`}, ['View full thread'])
                ),
                m('div.replies', replies)
              ])
            ])
          } else {
            if (group.lastUpdateType === 'reply') {
              meta = m('div.meta', [
                manyPeople(group.repliesFrom), ' replied to ', message_link(group.messageId)
              ])
            } else if (group.lastUpdateType === 'dig') {
              meta = m('div.meta', [
                manyPeople(group.digs), ' dug ', message_link(group.messageId)
              ])
            }

            if (meta || replies.length) {
              return m('FeedEvent', [
                meta, m('div.replies', replies)
              ])
            }
          }
        } else if (group.type === 'follow') {
          return m('FeedEvent -follow', [
            m('div.meta', [
              person(group.id), ' followed ', manyPeople(group.contacts)
            ])
          ])
        }
      }, {maxTime: 5})
    ])

    var div = h('div.column.scroller', {
      style: {
        'overflow': 'auto'
      }
    }, [
      h('div.scroller__wrapper', [
        message_compose({type: 'post'}, {placeholder: 'Write a public message'}),
        content
      ])
    ])

    refresh()

    pull(
      sbot_log({old: false}),
      pull.drain((item) => {
        updates.set(updates() + 1)
      })
    )

    // pull(
    //   u.next(sbot_log, {reverse: true, limit: 100, live: false}),
    //   Scroller(div, content, message_render, false, false)
    // )

    return div
  }

  // scoped
  function refresh () {
    pull(
      sbot_log({reverse: true, limit: 500, live: false}),
      pull.collect((err, values) => {
        if (err) throw err
        events.set(groupMessages(values))
        sync.set(true)
        updates.set(0)
      })
    )
  }
}

function person (id) {
  return avatar_link(id, avatar_name(id), '')
}

function manyPeople (ids) {
  ids = Array.from(ids)
  var featuredIds = ids.slice(-3).reverse()

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
