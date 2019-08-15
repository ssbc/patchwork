const nest = require('depnest')
const ref = require('ssb-ref')

exports.needs = nest({
  'contact.obs.following': 'first',
  'sbot.async.publish': 'first',
  'sbot.async.friendsGet': 'first'
})

exports.gives = nest({
  'contact.async': ['follow', 'unfollow', 'followerOf', 'block', 'unblock']
})

exports.create = function (api) {
  return nest({
    'contact.async': { follow, unfollow, followerOf, block, unblock }
  })

  function followerOf (source, dest, cb) {
    api.sbot.async.friendsGet({ source: source, dest: dest }, cb)
  }

  function follow (id, cb) {
    if (!ref.isFeed(id)) throw new Error('a feed id must be specified')
    api.sbot.async.publish({
      type: 'contact',
      contact: id,
      following: true
    }, cb)
  }

  function unfollow (id, cb) {
    if (!ref.isFeed(id)) throw new Error('a feed id must be specified')
    api.sbot.async.publish({
      type: 'contact',
      contact: id,
      following: false
    }, cb)
  }

  function block (id, cb) {
    if (!ref.isFeed(id)) throw new Error('a feed id must be specified')
    api.sbot.async.publish({
      type: 'contact',
      contact: id,
      blocking: true
    }, cb)
  }

  function unblock (id, cb) {
    if (!ref.isFeed(id)) throw new Error('a feed id must be specified')
    api.sbot.async.publish({
      type: 'contact',
      contact: id,
      blocking: false
    }, cb)
  }
}
