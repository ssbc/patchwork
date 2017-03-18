var Value = require('mutant/value')
var when = require('mutant/when')
var computed = require('mutant/computed')
var h = require('mutant/h')
var MutantArray = require('mutant/array')
var Abortable = require('pull-abortable')
var map = require('mutant/map')
var pull = require('pull-stream')
var nest = require('depnest')

var onceTrue = require('mutant/once-true')
var Scroller = require('pull-scroll')

exports.needs = nest({
  'message.html': {
    render: 'first',
    link: 'first'
  },
  'sbot.async.get': 'first',
  'keys.sync.id': 'first',
  'about.obs.name': 'first',
  feed: {
    'html.rollup': 'first',
    'pull.summary': 'first'
  },
  profile: {
    'html.person': 'first'
  }
})

exports.gives = nest({
  'feed.html': ['rollup']
})

exports.create = function (api) {
  return nest({
    'feed.html': { rollup }
  })
  function rollup (getStream, opts) {
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

    var content = Value()

    var container = h('Scroller', {
      style: { overflow: 'auto' }
    }, [
      h('div.wrapper', [
        h('section.prepend', opts.prepend),
        when(sync, null, h('Loading -large')),
        content
      ])
    ])

    onceTrue(waitFor, () => {
      refresh()
      pull(
        getStream({old: false}),
        pull.drain((item) => {
          var type = item && item.value && item.value.content.type
          if (type && type !== 'vote' && typeof item.value.content === 'object' && item.value.timestamp > twoDaysAgo()) {
            if (item.value && item.value.author === api.keys.sync.id() && !updates() && type !== 'git-update') {
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
      container
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

      content.set(
        h('section.content', {
          hidden: computed(sync, s => !s)
        })
      )

      var abortable = Abortable()
      abortLastFeed = abortable.abort

      pull(
        api.feed.pull.summary(getStream, {windowSize, bumpFilter}, () => {
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
        Scroller(container, content(), renderItem, false, false)
      )
    }

    function renderItem (item) {
      if (item.type === 'message') {
        var meta = null
        var previousId = item.messageId
        var replies = item.replies.slice(-4).map((msg) => {
          var result = api.message.html.render(msg, {inContext: true, inSummary: true, previousId})
          previousId = msg.key
          return result
        })
        var renderedMessage = item.message ? api.message.html.render(item.message, {inContext: true}) : null
        if (renderedMessage) {
          if (item.lastUpdateType === 'reply' && item.repliesFrom.size) {
            meta = h('div.meta', {
              title: names(item.repliesFrom)
            }, [
              many(item.repliesFrom, api.profile.html.person), ' replied'
            ])
          } else if (item.lastUpdateType === 'like' && item.likes.size) {
            meta = h('div.meta', {
              title: names(item.likes)
            }, [
              many(item.likes, api.profile.html.person), ' liked this message'
            ])
          }

          return h('FeedEvent', [
            meta,
            renderedMessage,
            when(replies.length, [
              when(item.replies.length > replies.length || opts.partial,
                h('a.full', {href: item.messageId}, ['View full thread'])
              ),
              h('div.replies', replies)
            ])
          ])
        } else {
          if (item.lastUpdateType === 'reply' && item.repliesFrom.size) {
            meta = h('div.meta', {
              title: names(item.repliesFrom)
            }, [
              many(item.repliesFrom, api.profile.html.person), ' replied to ', api.message.html.link(item.messageId)
            ])
          } else if (item.lastUpdateType === 'like' && item.likes.size) {
            meta = h('div.meta', {
              title: names(item.likes)
            }, [
              many(item.likes, api.profile.html.person), ' liked ', api.message.html.link(item.messageId)
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
            title: names(item.contacts)
          }, [
            api.profile.html.person(item.id), ' followed ', many(item.contacts, api.profile.html.person)
          ])
        ])
      } else if (item.type === 'subscribe') {
        return h('FeedEvent -subscribe', [
          h('div.meta', {
            title: Array.from(item.channels).map(c => `#${c}`).join('\n')
          }, [
            api.profile.html.person(item.id), ' subscribed to ', many(item.channels, (channel) => {
              return h('a', {href: `#${channel}`}, `#${channel}`)
            })
          ])
        ])
      }

      return h('div')
    }
  }

  function ensureAuthor (item, cb) {
    if (item.type === 'message' && !item.message) {
      api.sbot.async.get(item.messageId, (_, value) => {
        if (value) {
          item.author = value.author
        }
        cb(null, item)
      })
    } else {
      cb(null, item)
    }
  }

  function names (ids) {
    var items = map(Array.from(ids), api.about.obs.name)
    return computed([items], (names) => names.map((n) => `- ${n}`).join('\n'))
  }
}

function twoDaysAgo () {
  return Date.now() - (2 * 24 * 60 * 60 * 1000)
}

function many (ids, fn) {
  ids = Array.from(ids)
  var featuredIds = ids.slice(-3).reverse()

  if (ids.length) {
    if (ids.length > 3) {
      return [
        fn(featuredIds[0]), ', ',
        fn(featuredIds[1]),
        ' and ', ids.length - 2, ' others'
      ]
    } else if (ids.length === 3) {
      return [
        fn(featuredIds[0]), ', ',
        fn(featuredIds[1]), ' and ',
        fn(featuredIds[2])
      ]
    } else if (ids.length === 2) {
      return [
        fn(featuredIds[0]), ' and ',
        fn(featuredIds[1])
      ]
    } else {
      return fn(featuredIds[0])
    }
  }
}
