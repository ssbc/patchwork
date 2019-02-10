var pull = require('pull-stream')
var ref = require('ssb-ref')
var parallel = require('run-parallel')
var Paramap = require('pull-paramap')
var pullCat = require('pull-cat')
var extend = require('xtend')

const HLRU = require('hashlru')
const pullResume = require('../lib/pull-resume')
const threadSummary = require('../lib/thread-summary')
const LookupRoots = require('../lib/lookup-roots')
const ResolveAbouts = require('../lib/resolve-abouts')
const UniqueRoots = require('../lib/unique-roots')
const getRoot = require('../lib/get-root')

var collator = new Intl.Collator('default', { sensitivity: 'base', usage: 'search' })

exports.manifest = {
  suggest: 'async',
  avatar: 'async',
  latest: 'source',
  roots: 'source'
}

exports.init = function (ssb, config) {
  var suggestCache = {}
  var updateQueue = new Set()
  var following = new Set()
  var recentFriends = []
  var cache = HLRU(100)

  // start update loop after 5 seconds
  setTimeout(updateLoop, 5e3)
  setTimeout(watchRecent, 10e3)

  setTimeout(() => {
    // use the public friend states for suggestions (not private)
    // so that we can find friends that we can still find ignored friends (privately blocked)
    pull(
      ssb.patchwork.contacts.stateStream({ live: true, feedId: ssb.id }),
      pull.drain(states => {
        Object.keys(states).forEach(key => {
          if (states[key] === true) {
            following.add(key)
            updateQueue.add(key)
          } else {
            following.delete(key)
          }
        })
      })
    )
  }, 5)

  pull(
    ssb.backlinks.read({
      live: true,
      old: false,
      query: [{ $filter: {
        dest: { $prefix: '@' },
        value: { content: { type: 'about' } }
      } }]
    }),
    pull.filter(msg => {
      return msg.value && msg.value.content && ref.isFeedId(msg.value.content.about) && (typeof msg.value.content.name === 'string' || msg.value.content.image)
    }),
    pull.drain(msg => {
      updateQueue.add(msg.value.content.about)
    })
  )

  function updateLoop () {
    if (updateQueue.size) {
      var ids = Array.from(updateQueue)
      updateQueue.clear()
      update(ids, () => {
        if (updateQueue.size) {
          updateLoop()
        } else {
          setTimeout(updateLoop, 10e3)
        }
      })
    } else {
      setTimeout(updateLoop, 10e3)
    }
  }

  function watchRecent () {
    pull(
      pullCat([
        ssb.createLogStream({ reverse: true, limit: 100 }),
        ssb.createLogStream({ old: false })
      ]),
      pull.drain(msg => {
        if (!suggestCache[msg.value.author]) {
          updateQueue.add(msg.value.author)
        }

        // update recent friends
        if (following.has(msg.value.author)) {
          var index = recentFriends.indexOf(msg.value.author)
          if (~index) {
            recentFriends.splice(index, 1)
          }
          recentFriends.push(msg.value.author)
        }
      })
    )
  }

  function update (ids, cb) {
    if (Array.isArray(ids) && ids.length) {
      pull(
        pull.values(ids),
        Paramap((id, cb) => avatar({ id }, cb), 10),
        pull.drain(item => {
          suggestCache[item.id] = item
        }, cb)
      )
    } else {
      cb()
    }
  }

  return {
    avatar,
    suggest: function ({ text, limit, defaultIds }, cb) {
      defaultIds = defaultIds || []
      update(defaultIds.filter(id => !suggestCache[id]), function (err) {
        if (err) return cb(err)
        if (typeof text === 'string' && text.trim().length) {
          let matches = getMatches(suggestCache, text)
          let result = sort(matches, defaultIds, recentFriends, following)
          if (limit) {
            result = result.slice(0, limit)
          }

          // add following attribute
          result = result.map(x => extend(x, { following: following.has(x.id) }))

          cb(null, result)
        } else if (defaultIds && defaultIds.length) {
          cb(null, defaultIds.map(id => suggestCache[id]))
        } else {
          let ids = recentFriends.slice(-(limit || 20)).reverse()
          let result = ids.map(id => suggestCache[id])
          result = result.map(x => extend(x, { following: following.has(x.id) }))
          cb(null, result)
        }
      })
    },
    latest: function ({ id }) {
      return pull(
        ssb.createUserStream({ id, live: true, old: false, awaitReady: false }),
        pull.filter(bumpFilter),
        LookupRoots({ ssb, cache }),
        pull.filter(msg => {
          return !getRoot(msg.root)
        })
        // TODO: handle blocked users
      )

      function bumpFilter (msg) {
        return checkBump(msg, { id })
      }
    },
    roots: function ({ id, limit, reverse, resume }) {
      // use resume option if specified

      var opts = { id, reverse, old: true, awaitReady: false }
      if (resume) {
        opts[reverse ? 'lt' : 'gt'] = resume
      }

      return pullResume.source(ssb.createUserStream(opts), {
        limit,
        getResume: (item) => {
          return item && item.value && item.value.sequence
        },
        filterMap: pull(
          pull.filter(bumpFilter),

          LookupRoots({ ssb, cache }),

          // DON'T REPEAT THE SAME THREAD
          UniqueRoots(),

          // DON'T INCLUDE UN-ROOTED MESSAGES (e.g. missing conversation root)
          pull.filter(msg => {
            return !getRoot(msg.root)
          }),

          // JUST RETURN THE ROOT OF THE MESSAGE
          pull.map(msg => {
            return msg.root || msg
          }),

          // RESOLVE ROOTS WITH ABOUTS (gatherings)
          ResolveAbouts({ socialValues: ssb.about.socialValues, latestValues: ssb.about.latestValues }),

          // ADD THREAD SUMMARY
          Paramap((item, cb) => {
            threadSummary(item.key, {
              readThread: ssb.patchwork.thread.read,
              recentLimit: 3,
              bumpFilter,
              recentFilter
              // TODO: hide blocked replies from other users
            }, (err, summary) => {
              if (err) return cb(err)
              cb(null, extend(item, summary))
            })
          }, 20)
        )
      })

      function recentFilter (msg) {
        // only show replies by this feed on the profile
        return msg.value.author === id
      }

      function bumpFilter (msg) {
        return checkBump(msg, { id })
      }
    }
  }

  function avatar ({ id }, cb) {
    var result = { id }
    parallel([(done) => {
      ssb.about.socialValue({ dest: id, key: 'name' }, (err, value) => {
        if (err) return done(err)
        result['name'] = value
        done()
      })
    }, (done) => {
      ssb.about.socialValue({ dest: id, key: 'image' }, (err, value) => {
        if (err) return done(err)
        if (value && value instanceof Object && value.link) value = value.link
        result['image'] = value
        done()
      })
    }], (err) => {
      if (err) return cb(err)
      cb(null, result)
    })
  }
}

function startsWith (text, startsWith) {
  return collator.compare(text.slice(0, startsWith.length), startsWith) === 0
}

function sort (items, defaultItems, recentFriends, following) {
  return items.sort((a, b) => {
    return compareBool(defaultItems.includes(a.id), defaultItems.includes(b.id)) ||
           compareBool(recentFriends.includes(a.id), recentFriends.includes(b.id)) ||
           compareBool(following.has(a.id), following.has(b.id)) ||
           a.name.length - b.name.length
  })
}

function compareBool (a, b) {
  if (a === b) {
    return 0
  } else if (a) {
    return -1
  } else {
    return 1
  }
}

function getMatches (cache, text) {
  var result = []
  var values = Object.values(cache)

  values.forEach((item) => {
    if (typeof item.name === 'string' && startsWith(item.name, text)) {
      result.push(item)
    }
  })
  return result
}

function checkBump (msg, { id }) {
  if (msg.value.author === id) {
    let content = msg.value.content
    let type = content.type
    if (type === 'vote' && !getRoot(msg)) { // only show likes when root post
      let vote = content.vote
      if (vote) {
        return { type: 'reaction', reaction: vote.expression, value: vote.value }
      }
    } else if (type === 'post') {
      if (getRoot(msg)) {
        return 'reply'
      } else {
        return 'post'
      }
    } else if (type === 'about') {
      return 'update'
    } else if (type === 'contact') {
      return 'post'
    }
  }
}
