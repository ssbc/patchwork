'use strict'
const pull = require('pull-stream')
const HLRU = require('hashlru')
const extend = require('xtend')
const normalizeChannel = require('ssb-ref').normalizeChannel
const Defer = require('pull-defer')
const pullResume = require('../lib/pull-resume')
const threadSummary = require('../lib/thread-summary')
const LookupRoots = require('../lib/lookup-roots')
const ResolveAbouts = require('../lib/resolve-abouts')
const Paramap = require('pull-paramap')
const getRoot = require('../lib/get-root')

exports.manifest = {
  roots: 'source'
}

exports.init = function (ssb, config) {
  // cache mostly just to avoid reading the same roots over and over again
  // not really big enough for multiple refresh cycles
  var cache = HLRU(100)

  return {
    roots: function ({ reverse, limit, resume }) {
      var seen = new Set()
      var included = new Set()

      var stream = Defer.source()

      getFilter({ ssb }, (err, filter, hops) => {
        if (err) return stream.abort(err)

        // use resume option if specified
        var opts = { reverse, old: true }
        if (resume) {
          opts[reverse ? 'lt' : 'gt'] = resume
        }

        stream.resolve(pullResume.source(ssb.createFeedStream(opts), {
          limit,
          getResume: (item) => {
            // WAITING FOR: https://github.com/ssbc/secure-scuttlebutt/pull/215
            // otherwise roots can potentially have unwanted items pinned to top of feed
            // if a message has a timestamp far in the future
            return item && (item.rts || (item.value && item.value.timestamp))
          },
          filterMap: pull(
            // BUMP FILTER
            pull.filter(item => {
              if (filter && item && item.value && item.value.content && item.value.content instanceof Object) {
                var filterResult = filter(item)
                if (filterResult) {
                  item.filterResult = filterResult
                  return true
                }
              }
            }),

            // LOOKUP AND ADD ROOTS
            LookupRoots({ ssb, cache }),

            // FILTER BLOCKED (don't bump if author blocked, don't include if root author blocked)
            pull.filter(item => {
              if (item.value && hops[item.value.author] < 0) return false
              if (item.root && item.root.value && hops[item.root.value.author] < 0) return false
              return true
            }),

            // FILTER ROOTS
            pull.filter(item => {
              var root = item.root || item
              var isPrivate = root.value && root.value.private

              // skip this item if it has already been included
              if (!included.has(root.key) && filter && root && root.value && !isPrivate) {
                if (checkReplyForcesDisplay(item)) { // include this item if it has matching tags or the author is you
                  // update filter result so that we can display the correct bump message
                  root.filterResult = extend(item.filterResult, { forced: true })
                  included.add(root.key)
                  return true
                } else if (!seen.has(root.key)) {
                  seen.add(root.key)
                  var filterResult = filter(root)
                  if (shouldShow(filterResult)) {
                    root.filterResult = filterResult
                    included.add(root.key)
                    return true
                  }
                }
              }
            }),

            // MAP ROOT ITEMS
            pull.map(item => {
              var root = item.root || item
              return root
            }),

            // RESOLVE ROOTS WITH ABOUTS
            ResolveAbouts({ ssb }),

            // ADD THREAD SUMMARY
            Paramap((item, cb) => {
              threadSummary(item.key, {
                recentLimit: 3,
                readThread: ssb.patchwork.thread.read,
                bumpFilter,
                messageFilter: (msg) => !hops[msg.value.author] || hops[msg.value.author] >= 0 // don't include blocked messages
              }, (err, summary) => {
                if (err) return cb(err)
                cb(null, extend(item, summary, {
                  filterResult: undefined,
                  rootBump: bumpFromFilterResult(item, item.filterResult)
                }))
              })
            }, 20)
          )
        }))

        function bumpFilter (msg) {
          let filterResult = filter(msg)
          return bumpFromFilterResult(msg, filterResult)
        }
      })

      return stream
    }
  }

  function shouldShow (filterResult) {
    return !!filterResult
  }
}

function getMatchingTags (lookup, mentions) {
  if (Array.isArray(mentions)) {
    return mentions.reduce((result, mention) => {
      if (mention && typeof mention.link === 'string' && mention.link.startsWith('#')) {
        if (checkChannel(lookup, mention.link.slice(1))) {
          result.push(normalizeChannel(mention.link.slice(1)))
        }
      }
      return result
    }, [])
  }
  return []
}

function getMentionsYou (ids, mentions) {
  if (Array.isArray(mentions)) {
    return mentions.some((mention) => {
      if (mention && typeof mention.link === 'string') {
        return ids.includes(mention.link)
      }
    })
  }
}

function checkReplyForcesDisplay (item) {
  var filterResult = item.filterResult || {}
  var matchesTags = filterResult.matchingTags && !!filterResult.matchingTags.length
  return matchesTags || filterResult.isYours
}

function checkChannel (lookup, channel) {
  if (!lookup) return false
  channel = normalizeChannel(channel)
  if (channel) {
    return lookup[channel] && lookup[channel].subscribed
  }
}

function bumpFromFilterResult (msg, filterResult) {
  if (filterResult) {
    if (isAttendee(msg)) {
      return 'attending'
    } else if (filterResult.following) {
      if (msg.value.content.type === 'post') {
        if (getRoot(msg)) {
          return 'reply'
        } else {
          return 'post'
        }
      } else {
        return 'updated'
      }
    } else if (filterResult.matchesChannel || filterResult.matchingTags.length) {
      var channels = new Set()
      if (filterResult.matchesChannel) channels.add(msg.value.content.channel)
      if (Array.isArray(filterResult.matchingTags)) filterResult.matchingTags.forEach(x => channels.add(x))
      return { type: 'matches-channel', channels: Array.from(channels) }
    }
  }
}

function isAttendee (msg) {
  var content = msg.value && msg.value.content
  return (content && content.type === 'about' && content.attendee && !content.attendee.remove)
}

function getFilter ({ ssb }, cb) {
  // TODO: rewrite contacts stream
  ssb.friends.hops((err, hops) => {
    if (err) return cb(err)

    // TODO: support sameAs multiple IDs
    ssb.patchwork.subscriptions2.get({ id: ssb.id }, (err, subscriptions) => {
      if (err) return cb(err)
      cb(null, function (msg) {
        var type = msg.value.content.type
        if (type === 'vote') return false // filter out likes
        var hasChannel = !!msg.value.content.channel
        var matchesChannel = (type !== 'channel' && checkChannel(subscriptions, msg.value.content.channel))
        var matchingTags = getMatchingTags(subscriptions, msg.value.content.mentions)
        var isYours = hops[msg.value.author] === 0
        var mentionsYou = getMentionsYou([ssb.id], msg.value.content.mentions)

        var following = hops[msg.value.author] === 1
        if (isYours || matchesChannel || matchingTags.length || following || mentionsYou) {
          return {
            matchingTags, matchesChannel, isYours, following, mentionsYou, hasChannel
          }
        }
      }, hops)
    })
  })
}
