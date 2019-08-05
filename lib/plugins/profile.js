var pull = require('pull-stream')
var parallel = require('run-parallel')
var Paramap = require('pull-paramap')
var extend = require('xtend')

const HLRU = require('hashlru')
const pullResume = require('../pull-resume')
const threadSummary = require('../thread-summary')
const LookupRoots = require('../lookup-roots')
const ResolveAbouts = require('../resolve-abouts')
const UniqueRoots = require('../unique-roots')
const getRoot = require('../get-root')

exports.manifest = {
  avatar: 'async',
  latest: 'source',
  roots: 'source'
}

exports.init = function (ssb) {
  var cache = HLRU(100)

  return {
    avatar: function avatar ({ id }, cb) {
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
    },
    latest: function latest ({ id }) {
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
    roots: function roots ({ id, limit, reverse, resume }) {
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
          ResolveAbouts({ ssb }),

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
}

function checkBump (msg, { id }) {
  if (msg.value.author === id) {
    const content = msg.value.content
    const type = content.type
    if (type === 'vote' && !getRoot(msg)) { // only show likes when root post
      const vote = content.vote
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
