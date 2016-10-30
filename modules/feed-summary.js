var Value = require('@mmckegg/mutant/value')
var h = require('@mmckegg/mutant/html-element')
var when = require('@mmckegg/mutant/when')
var computed = require('@mmckegg/mutant/computed')
var MutantArray = require('@mmckegg/mutant/array')
var Abortable = require('pull-abortable')
var Scroller = require('../lib/pull-scroll')
var FeedSummary = require('../lib/feed-summary')

var m = require('../lib/h')

var pull = require('pull-stream')

var plugs = require('patchbay/plugs')
var message_render = plugs.first(exports.message_render = [])
var message_link = plugs.first(exports.message_link = [])
var person = plugs.first(exports.person = [])
var many_people = plugs.first(exports.many_people = [])

exports.feed_summary = function (getStream, prefix) {
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
      prefix, content
    ])
  ])

  setTimeout(refresh, 10)

  pull(
    getStream({old: false}),
    pull.drain((item) => {
      var type = item && item.value && item.value.content.type
      if (type && type !== 'vote') {
        updates.set(updates() + 1)
      }
    })
  )

  var abortLastFeed = null

  return MutantArray([
    when(updates, updateLoader),
    when(sync, scrollElement, m('Loading -large'))
  ])

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
      FeedSummary(getStream, 1000, () => {
        sync.set(true)
      }),
      abortable,
      Scroller(scrollElement, content, renderItem, false, false)
    )
  }
}

function renderItem (item) {
  if (item.type === 'message') {
    var meta = null
    var replies = item.replies.slice(-3).map(m => message_render(m, true))
    var renderedMessage = item.message ? message_render(item.message, true) : null
    if (renderedMessage) {
      if (item.lastUpdateType === 'reply' && item.repliesFrom.size) {
        meta = m('div.meta', [
          many_people(item.repliesFrom), ' replied'
        ])
      } else if (item.lastUpdateType === 'dig' && item.digs.size) {
        meta = m('div.meta', [
          many_people(item.digs), ' dug this message'
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
          many_people(item.repliesFrom), ' replied to ', message_link(item.messageId)
        ])
      } else if (item.lastUpdateType === 'dig' && item.digs.size) {
        meta = m('div.meta', [
          many_people(item.digs), ' dug ', message_link(item.messageId)
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
        person(item.id), ' followed ', many_people(item.contacts)
      ])
    ])
  }

  return h('div')
}
