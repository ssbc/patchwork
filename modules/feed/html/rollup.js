var Value = require('mutant/value')
var when = require('mutant/when')
var computed = require('mutant/computed')
var h = require('mutant/h')
var MutantArray = require('mutant/array')
var Abortable = require('pull-abortable')
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
  feed: {
    'html.rollup': 'first',
    'pull.summary': 'first'
  },
  profile: {
    'html.person': 'first',
    'html.manyPeople': 'first',
    'obs.names': 'first'
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

    var updateLoader = h('a', {
      className: 'Notifier -loader',
      href: '#',
      'ev-click': refresh
    }, [
      'Show ',
      h('strong', [updates]), ' ',
      when(computed(updates, a => a === 1), 'update', 'updates')
    ])

    var content = h('section.content')

    var container = h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('section.prepend', opts.prepend),
        content
      ])
    ])

    setTimeout(refresh, 10)

    onceTrue(waitFor, () => {
      pull(
        getStream({old: false}),
        pull.drain((item) => {
          var type = item && item.value && item.value.content.type
          if (type && type !== 'vote') {
            if (item.value && item.value.author === api.keys.sync.id() && !updates()) {
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
      //when(sync, container, h('div', {className: 'Loading -large'}))
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
        Scroller(container, content, renderItem, false, false)
      )
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
            title: api.profile.obs.names(item.repliesFrom)
          }, [
            api.profile.html.manyPeople(item.repliesFrom), ' replied'
          ])
        } else if (item.lastUpdateType === 'dig' && item.digs.size) {
          meta = h('div.meta', {
            title: api.profile.obs.names(item.digs)
          }, [
            api.profile.html.manyPeople(item.digs), ' dug this message'
          ])
        }

        return h('div', {className: 'FeedEvent'}, [
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
            title: api.profile.obs.names(item.repliesFrom)
          }, [
            api.profile.html.manyPeople(item.repliesFrom), ' replied to ', api.message.html.link(item.messageId)
          ])
        } else if (item.lastUpdateType === 'dig' && item.digs.size) {
          meta = h('div.meta', {
            title: api.profile.obs.names(item.digs)
          }, [
            api.profile.html.manyPeople(item.digs), ' dug ', api.message.html.link(item.messageId)
          ])
        }

        if (meta || replies.length) {
          return h('div', {className: 'FeedEvent'}, [
            meta, h('div.replies', replies)
          ])
        }
      }
    } else if (item.type === 'follow') {
      return h('div', {className: 'FeedEvent -follow'}, [
        h('div.meta', {
          title: api.profile.obs.names(item.contacts)
        }, [
          api.profile.html.person(item.id), ' followed ', api.profile.html.manyPeople(item.contacts)
        ])
      ])
    }

    return h('div')
  }
}
