'use strict'
const pull = require('pull-stream')
const HLRU = require('hashlru')
const extend = require('xtend')
const normalizeChannel = require('ssb-ref').normalizeChannel
const pullResume = require('../pull-resume')
const threadSummary = require('../thread-summary')
const LookupRoots = require('../lookup-roots')
const ResolveAbouts = require('../resolve-abouts')
const Paramap = require('pull-paramap')
const getRoot = require('../get-root')
const FilterBlocked = require('../filter-blocked')
const PullCont = require('pull-cont/source')

exports.manifest = {
  latest: 'source',
  roots: 'source'
}

exports.init = function (ssb, config) {
  // cache mostly just to avoid reading the same roots over and over again
  // not really big enough for multiple refresh cycles
  var cache = HLRU(100)

  return {
    latest: function () {
      return pull(
        ssb.createFeedStream({ live: true, old: false, awaitReady: false }),

        ApplyFilterResult({ ssb }),
        pull.filter(msg => !!msg.filterResult),

        LookupRoots({ ssb, cache }),

        FilterPrivateRoots(),
        FilterBlocked([ssb.id], {
          isBlocking: ssb.patchwork.contacts.isBlocking,
          useRootAuthorBlocks: true,
          checkRoot: true
        }),

        ApplyRootFilterResult({ ssb }),
        pull.filter(msg => {
          var root = msg.root || msg
          return root.filterResult
        })
      )
    },
    roots: function ({ reverse, limit, resume }) {
      var seen = new Set()
      var included = new Set()

      // use resume option if specified
      var opts = { reverse, old: true, awaitReady: false }
      if (resume) {
        opts[reverse ? 'lt' : 'gt'] = resume
      }

      return PullCont(cb => {
        // wait until contacts have resolved before reading
        ssb.patchwork.contacts.raw.get(() => {
          cb(null, pullResume.source(ssb.createFeedStream(opts), {
            limit,
            getResume: (item) => {
              return item && item.rts
            },
            filterMap: pull(
              ApplyFilterResult({ ssb }),
              pull.filter(msg => !!msg.filterResult),

              LookupRoots({ ssb, cache }),

              FilterPrivateRoots(),

              FilterBlocked([ssb.id], {
                isBlocking: ssb.patchwork.contacts.isBlocking,
                useRootAuthorBlocks: true,
                checkRoot: true
              }),

              ApplyRootFilterResult({ ssb }),

              // FILTER ROOTS
              pull.filter(item => {
                var root = item.root || item
                if (!included.has(root.key) && root && root.value && root.filterResult) {
                  if (root.filterResult.forced) {
                    // force include the root when a reply has matching tags or the author is you
                    included.add(root.key)
                    return true
                  } else if (!seen.has(root.key)) {
                    seen.add(root.key)
                    if (shouldShow(root.filterResult)) {
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
                  pullFilter: pull(
                    FilterBlocked([item.value && item.value.author, ssb.id], { isBlocking: ssb.patchwork.contacts.isBlocking }),
                    ApplyFilterResult({ ssb })
                  ),
                  recentLimit: 3,
                  readThread: ssb.patchwork.thread.read,
                  bumpFilter: bumpFilter
                }, (err, summary) => {
                  if (err) return cb(err)
                  cb(null, extend(item, summary, {
                    filterResult: undefined,
                    rootBump: bumpFilter
                  }))
                })
              }, 20)
            )
          }))
        })
      })
    }
  }

  function shouldShow (filterResult) {
    return !!filterResult
  }
}

function FilterPrivateRoots () {
  return pull.filter(msg => {
    return !msg.root || (msg.root.value && !msg.root.value.private)
  })
}

function ApplyRootFilterResult ({ ssb }) {
  return Paramap((item, cb) => {
    if (item.root) {
      getFilterResult(item.root, { ssb }, (err, rootFilterResult) => {
        if (err) return cb(err)
        if (item.filterResult && checkReplyForcesDisplay(item)) { // include this item if it has matching tags or the author is you
          item.root.filterResult = extend(item.filterResult, { forced: true })
        } else {
          item.root.filterResult = rootFilterResult
        }
        cb(null, item)
      })
    } else {
      cb(null, item)
    }
  })
}

function ApplyFilterResult ({ ssb }) {
  return Paramap((item, cb) => {
    getFilterResult(item, { ssb }, (err, filterResult) => {
      if (err) return cb(err)
      item.filterResult = filterResult
      cb(null, item)
    })
  }, 10)
}

function getFilterResult (msg, { ssb }, cb) {
  ssb.patchwork.contacts.isFollowing({ source: ssb.id, dest: msg.value.author }, (err, following) => {
    if (err) return cb(err)
    ssb.patchwork.subscriptions2.get({ id: ssb.id }, (err, subscriptions) => {
      if (err) return cb(err)
      var type = msg.value.content.type
      if (type === 'vote' || type === 'tag') return cb() // filter out likes and tags
      var hasChannel = !!msg.value.content.channel
      var matchesChannel = (type !== 'channel' && checkChannel(subscriptions, msg.value.content.channel))
      var matchingTags = getMatchingTags(subscriptions, msg.value.content.mentions)
      var isYours = msg.value.author === ssb.id
      var mentionsYou = getMentionsYou([ssb.id], msg.value.content.mentions)
      if (isYours || matchesChannel || matchingTags.length || following || mentionsYou) {
        cb(null, {
          matchingTags, matchesChannel, isYours, following, mentionsYou, hasChannel
        })
      } else {
        cb()
      }
    })
  })
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

function bumpFilter (msg) {
  var filterResult = msg.filterResult
  if (filterResult) {
    if (isAttendee(msg)) {
      return 'attending'
    } else if (filterResult.following || filterResult.isYours) {
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
