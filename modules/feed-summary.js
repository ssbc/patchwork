var Value = require('mutant/value')
var when = require('mutant/when')
var computed = require('mutant/computed')
var MutantArray = require('mutant/array')
var Abortable = require('pull-abortable')
var onceTrue = require('../lib/once-true')
var pull = require('pull-stream')

var Scroller = require('../lib/pull-scroll')
var FeedSummary = require('../lib/feed-summary')

var h = require('../lib/h')

exports.needs = {
  message: {
    render: 'first',
    link: 'first'
  },
  sbot: {
    get: 'first',
    get_id: 'first'
  },
  helpers: {
    build_scroller: 'first'
  },
  person: 'first',
  many_people: 'first',
  people_names: 'first'
}

exports.gives = {
  feed_summary: true
}

exports.create = function (api) {
  return {
    feed_summary (getStream, prepend, opts) {
      var sync = Value(false)
      var updates = Value(0)

      var filter = opts && opts.filter
      var bumpFilter = opts && opts.bumpFilter
      var windowSize = opts && opts.windowSize
      var waitFor = opts && opts.waitFor || true

      var updateLoader = h('a Notifier -loader', {
        href: '#',
        'ev-click': refresh
      }, [
        'Show ',
        h('strong', [updates]), ' ',
        when(computed(updates, a => a === 1), 'update', 'updates')
      ])

      var { container, content } = api.helpers.build_scroller({ prepend })

      setTimeout(refresh, 10)

      onceTrue(waitFor, () => {
        pull(
          getStream({old: false}),
          pull.drain((item) => {
            var type = item && item.value && item.value.content.type
            if (type && type !== 'vote') {
              if (item.value && item.value.author === api.sbot.get_id() && !updates()) {
                return refresh()
              }
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
        when(sync, container, h('Loading -large'))
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
          Scroller(container, content, renderItem, false, false)
        )
      }
    }
  }

  function ensureAuthor (item, cb) {
    if (item.type === 'message' && !item.message) {
      api.sbot.get(item.messageId, (_, value) => {
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
        var result = api.message.render(msg, {inContext: true, inSummary: true, previousId})
        previousId = msg.key
        return result
      })
      var renderedMessage = item.message ? api.message.render(item.message, {inContext: true}) : null
      if (renderedMessage) {
        if (item.lastUpdateType === 'reply' && item.repliesFrom.size) {
          meta = h('div.meta', {
            title: api.people_names(item.repliesFrom)
          }, [
            api.many_people(item.repliesFrom), ' replied'
          ])
        } else if (item.lastUpdateType === 'dig' && item.digs.size) {
          meta = h('div.meta', {
            title: api.people_names(item.digs)
          }, [
            api.many_people(item.digs), ' dug this message'
          ])
        }

        return h('FeedEvent', [
          meta,
          renderedMessage,
          when(replies.length, [
            when(item.replies.length > replies.length,
              h('a.full', {href: `#${item.messageId}`}, ['View full thread'])
            ),
            h('div.replies', replies)
          ])
        ])
      } else {
        if (item.lastUpdateType === 'reply' && item.repliesFrom.size) {
          meta = h('div.meta', {
            title: api.people_names(item.repliesFrom)
          }, [
            api.many_people(item.repliesFrom), ' replied to ', api.message.link(item.messageId)
          ])
        } else if (item.lastUpdateType === 'dig' && item.digs.size) {
          meta = h('div.meta', {
            title: api.people_names(item.digs)
          }, [
            api.many_people(item.digs), ' dug ', api.message.link(item.messageId)
          ])
        }

        if (meta || replies.length) {
          return h('FeedEvent', [
            meta, h('div.replies', replies)
          ])
        }
      }
    } else if (item.type === 'follow') {
      return h('FeedEvent -follow', [
        h('div.meta', {
          title: api.people_names(item.contacts)
        }, [
          api.person(item.id), ' followed ', api.many_people(item.contacts)
        ])
      ])
    }

    return h('div')
  }
}
