var Value = require('mutant/value')
var when = require('mutant/when')
var computed = require('mutant/computed')
var h = require('mutant/h')
var MutantArray = require('mutant/array')
var map = require('mutant/map')
var pull = require('pull-stream')
var nest = require('depnest')

var onceTrue = require('mutant/once-true')
var Scroller = require('pull-scroll')

var pullNext = require('pull-next')
var pullDefer = require('pull-defer')
var rollupMessages = require('../../../lib/ssb-rollup')

exports.needs = nest({
  'message.html': {
    render: 'first',
    link: 'first'
  },
  'app.sync.externalHandler': 'first',
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
  function rollup (getStream, {
    // opts:
    prepend,
    messageFilter,
    compare,
    windowSize = 2000,
    compareMessages
  }) {
    var sync = Value(false)
    var content = h('section.content', {
      //hidden: computed(sync, s => !s)
    })

    var container = h('Scroller', {
      style: { overflow: 'auto' }
    }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        when(sync, null, h('Loading -large')),
        content
      ])
    ])

    var last = null
    var done = false

    // run rollup of messages in batches of `windowSize || 2000`
    pull(
      pullNext(function () {
        if (!done) {
          var next = {reverse: true, limit: windowSize, live: false}
          if (last) next.lt = last.timestamp || last.value.sequence
          var deferred = pullDefer.source()
          pull(
            getStream(next),
            pull.collect((err, msgs) => {
              if (err) throw err
              if (!msgs.length) {
                done = true
                deferred.resolve(pull.values([]))
                sync.set(true)
              } else {
                last = msgs[msgs.length - 1]
                if (typeof compareMessages === 'function') {
                  msgs.sort(compareMessages)
                }
                rollupMessages(msgs, {messageFilter, compare, windowSize}, (err, result) => {
                  if (err) throw err
                  deferred.resolve(
                    pull.values(result)
                  )
                  sync.set(true)
                })
              }
            })
          )
          return deferred
        }
      }),
      Scroller(container, content, renderItem, false, false)
    )

    return container

    // scoped

    function renderItem (item, opts) {
      var classList = []
      var partial = opts && opts.partial
      // if (item.priority >= 2) {
      //   classList.push('-new')
      // }

      if (item.type === 'thread') {
        var event = getEvent(item)
        var repliesFrom = getReplyAuthors(item)
        var likesFrom = getLikeAuthors(item)

        var meta = null
        var previousId = item.rootId

        var replies = item.replies.sort((a, b) => {
          return a.value.timestamp - b.value.timestamp
        }).slice(-4).map((msg) => {
          var result = api.message.html.render(msg, {
            inContext: true,
            inSummary: true,
            previousId,
            //priority: prioritized[msg.key]
          })
          previousId = msg.key
          return result
        })

        var renderedMessage = item.root ? api.message.html.render(item.root, {inContext: true}) : null
        if (renderedMessage) {
          if (event === 'reply') {
            meta = h('div.meta', {
              title: names(repliesFrom)
            }, [
              many(repliesFrom, api.profile.html.person), ' replied'
            ])
          } else if (event === 'like') {
            meta = h('div.meta', {
              title: names(likesFrom)
            }, [
              many(likesFrom, api.profile.html.person), ' liked this message'
            ])
          }

          if (item.rootId === '%s4r+WJ30j0X7C6u6geyb7jWjV5ScIli3C8Wrt0K0vjs=.sha256') {
            console.log(renderedMessage)
          }

          return h('FeedEvent -post', {
            attributes: {
              'data-root-id': item.rootId
            }
          }, [
            meta,
            renderedMessage,
            when(replies.length, [
              when(item.replies.length > replies.length || partial,
                h('a.full', {href: item.rootId}, ['View full thread'])
              ),
              h('div.replies', replies)
            ])
          ])
        } else {
          // only show this event if it has replies
          if (repliesFrom.size) {
            return h('FeedEvent -replies', [
              h('div.meta', {
                title: names(repliesFrom)
              }, [
                many(repliesFrom, api.profile.html.person), ' replied to ', api.message.html.link(item.rootId)
              ]),
              h('div.replies', replies)
            ])
          }
        }
      } else if (item.type === 'friends') {
        return h('FeedEvent -friends', {classList}, [
          h('div.meta', [
            api.profile.html.person(item.id),
            ' is now friends with ',
            h('span', { title: names(item.contacts) }, [
              many(item.contacts, api.profile.html.person)
            ])
          ])
        ])
      } else if (item.type === 'follow-source') {
        return h('FeedEvent -follow', {classList}, [
          h('div.meta', [
            api.profile.html.person(item.id),
            ' followed ',
            h('span', { title: names(item.contacts) }, [
              many(item.contacts, api.profile.html.person)
            ])
          ])
        ])
      } else if (item.type === 'follow-target') {
        return h('FeedEvent -follow', {classList}, [
          h('div.meta', [
            h('span', { title: names(item.contacts) }, [
              many(item.contacts, api.profile.html.person)
            ]),
            ' followed ',
            api.profile.html.person(item.id)
          ])
        ])
      }

      return h('div')
    }
  }

  function names (ids) {
    var items = map(Array.from(ids), api.about.obs.name)
    return computed([items], (names) => names.map((n) => `- ${n}`).join('\n'))
  }
}

function many (ids, fn) {
  ids = Array.from(ids)
  var featuredIds = ids.slice(0, 4)

  if (ids.length) {
    if (ids.length > 4) {
      return [
        fn(featuredIds[0]), ', ',
        fn(featuredIds[1]), ', ',
        fn(featuredIds[2]), ' and ',
        ids.length - 3, ' others'
      ]
    } else if (ids.length === 4) {
      return [
        fn(featuredIds[0]), ', ',
        fn(featuredIds[1]), ', ',
        fn(featuredIds[2]), ' and ',
        fn(featuredIds[3])
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

function getEvent (group) {
  if (!group.bumps.length) return null

  var msg = group.bumps[0]
  if (msg.key === group.rootId) {
    return 'post'
  } else if (msg.value.content.type === 'post') {
    return 'reply'
  } else if (msg.value.content.type === 'vote') {
    return 'like'
  }
}

function getReplyAuthors (group) {
  return group.bumps.reduce((result, msg) => {
    if (msg.value.content.type === 'post' && msg.key !== group.rootId) {
      result.add(msg.value.author)
    }
    return result
  }, new Set())
}

function getLikeAuthors (group) {
  return group.bumps.reduce((result, msg) => {
    if (msg.value.content.type === 'vote') {
      result.add(msg.value.author)
    }
    return result
  }, new Set())
}
