var Value = require('@mmckegg/mutant/value')
var h = require('@mmckegg/mutant/html-element')
var when = require('@mmckegg/mutant/when')
var computed = require('@mmckegg/mutant/computed')
var MutantArray = require('@mmckegg/mutant/array')
var Abortable = require('pull-abortable')
var Scroller = require('../lib/pull-scroll')
var FeedSummary = require('../lib/feed-summary')
var onceTrue = require('../lib/once-true')

var m = require('../lib/h')

var pull = require('pull-stream')

var plugs = require('patchbay/plugs')
var message_render = plugs.first(exports.message_render = [])
var message_link = plugs.first(exports.message_link = [])
var person = plugs.first(exports.person = [])
var many_people = plugs.first(exports.many_people = [])
var people_names = plugs.first(exports.people_names = [])
var sbot_get = plugs.first(exports.sbot_get = [])

exports.feed_summary = function (getStream, prefix, opts) {
  var sync = Value(false)
  var updates = Value(0)

  var filter = opts && opts.filter
  var bumpFilter = opts && opts.bumpFilter
  var windowSize = opts && opts.windowSize
  var waitFor = opts && opts.waitFor || true

  var updateLoader = m('a Notifier -loader', {
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

  onceTrue(waitFor, () => {
    pull(
      getStream({old: false}),
      pull.drain((item) => {
        var type = item && item.value && item.value.content.type
        if (item.value && item.value.author && !updates()) {
          return refresh()
        }
        if (type && type !== 'vote') {
          if (filter) {
            var update = (item.value.content.type === 'post' && item.value.content.root) ? {
              type: 'message',
              messageId: item.value.content.root,
              channel: item.value.content.channel
            } : {
              type: 'message',
              author: item.value.author,
              channel: item.value.content.channel,
              messageId: item.key
            }

            ensureAuthor(update, (err, update) => {
              if (!err) {
                if (filter(update)) {
                  updates.set(updates() + 1)
                }
              }
            })
          } else {
            updates.set(updates() + 1)
          }
        }
      })
    )
  })

  var abortLastFeed = null

  var result = MutantArray([
    when(updates, updateLoader),
    when(sync, scrollElement, m('Loading -large'))
  ])

  result.reload = refresh
  result.pendingUpdates = updates

  return result

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
      FeedSummary(getStream, {windowSize, bumpFilter}, () => {
        sync.set(true)
      }),
      pull.asyncMap(ensureAuthor),
      pull.filter((item) => {
        if (filter) {
          return filter(item)
        } else {
          return true
        }
      }),
      abortable,
      Scroller(scrollElement, content, renderItem, false, false)
    )
  }
}

function ensureAuthor (item, cb) {
  if (item.type === 'message' && !item.message) {
    sbot_get(item.messageId, (_, value) => {
      if (value) {
        item.author = value.author
      }
      cb(null, item)
    })
  } else {
    cb(null, item)
  }
}

function renderItem (item) {
  if (item.type === 'message') {
    var meta = null
    var previousId = item.messageId
    var replies = item.replies.slice(-4).map((msg) => {
      var result = message_render(msg, {inContext: true, inSummary: true, previousId})
      previousId = msg.key
      return result
    })
    var renderedMessage = item.message ? message_render(item.message, {inContext: true}) : null
    if (renderedMessage) {
      if (item.lastUpdateType === 'reply' && item.repliesFrom.size) {
        meta = m('div.meta', {
          title: people_names(item.repliesFrom)
        }, [
          many_people(item.repliesFrom), ' replied'
        ])
      } else if (item.lastUpdateType === 'dig' && item.digs.size) {
        meta = m('div.meta', {
          title: people_names(item.digs)
        }, [
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
        meta = m('div.meta', {
          title: people_names(item.repliesFrom)
        }, [
          many_people(item.repliesFrom), ' replied to ', message_link(item.messageId)
        ])
      } else if (item.lastUpdateType === 'dig' && item.digs.size) {
        meta = m('div.meta', {
          title: people_names(item.digs)
        }, [
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
      m('div.meta', {
        title: people_names(item.contacts)
      }, [
        person(item.id), ' followed ', many_people(item.contacts)
      ])
    ])
  }

  return h('div')
}
