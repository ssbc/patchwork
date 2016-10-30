var pull = require('pull-stream')
var paramap = require('pull-paramap')
var plugs = require('patchbay/plugs')
var cont = require('cont')
var ref = require('ssb-ref')

var sbot_log = plugs.first(exports.sbot_log = [])
var sbot_get = plugs.first(exports.sbot_get = [])
var sbot_user_feed = plugs.first(exports.sbot_user_feed = [])
var message_unbox = plugs.first(exports.message_unbox = [])
var get_id = plugs.first(exports.get_id = [])
var feed_summary = plugs.first(exports.feed_summary = [])

exports.screen_view = function (path) {
  if (path === '/notifications') {
    var oldest = null
    var id = get_id()
    var ids = {
      [id]: true
    }

    getFirstMessage(id, function (err, msg) {
      if (err) return console.error(err)
      if (!oldest || msg.value.timestamp < oldest) {
        oldest = msg.value.timestamp
      }
    })

    return feed_summary((opts) => {
      if (opts.old === false) {
        return pull(
          sbot_log(opts),
          unbox(),
          notifications(ids),
          pull.filter()
        )
      } else {
        return pull(
          sbot_log(opts),
          unbox(),
          notifications(ids),
          pull.filter(),
          pull.take(function (msg) {
            // abort stream after we pass the oldest messages of our feeds
            return !oldest || msg.value.timestamp > oldest
          })
        )
      }
    }, [])
  }
}

function unbox () {
  return pull(
    pull.map(function (msg) {
      return msg.value && typeof msg.value.content === 'string'
        ? message_unbox(msg)
        : msg
    }),
    pull.filter(Boolean)
  )
}

function notifications (ourIds) {
  function linksToUs (link) {
    return link && link.link in ourIds
  }

  function isOurMsg (id, cb) {
    if (!id) return cb(null, false)
    if (typeof id === 'object' && typeof id.link === 'string') id = id.link
    if (!ref.isMsg(id)) return cb(null, false)
    sbot_get(id, function (err, msg) {
      if (err && err.name === 'NotFoundError') cb(null, false)
      else if (err) cb(err)
      else if (msg.content.type === 'issue' || msg.content.type === 'pull-request') {
        isOurMsg(msg.content.repo || msg.content.project, cb)
      } else {
        cb(err, msg.author in ourIds)
      }
    })
  }

  function isAnyOurMessage (msg, ids, cb) {
    cont.para(ids.map(function (id) {
      return function (cb) { isOurMsg(id, cb) }
    }))(function (err, results) {
      if (err) cb(err)
      else if (results.some(Boolean)) cb(null, msg)
      else cb()
    })
  }

  return paramap(function (msg, cb) {
    var c = msg.value && msg.value.content
    if (!c || typeof c !== 'object') return cb()
    if (msg.value.author in ourIds) return cb()

    if (c.mentions && Array.isArray(c.mentions) && c.mentions.some(linksToUs)) {
      return cb(null, msg)
    }

    if (msg.private) {
      return cb(null, msg)
    }

    switch (c.type) {
      case 'post':
        if (c.branch || c.root) {
          return isAnyOurMessage(msg, [].concat(c.branch, c.root), cb)
        } else {
          return cb()
        }
      case 'contact':
        return cb(null, c.contact in ourIds ? msg : null)
      case 'vote':
        if (c.vote && c.vote.link)
          return isOurMsg(c.vote.link, function (err, isOurs) {
            cb(err, isOurs ? msg : null)
          })
          else return cb()
      case 'issue':
      case 'pull-request':
        return isOurMsg(c.project || c.repo, function (err, isOurs) {
          cb(err, isOurs ? msg : null)
        })
      case 'issue-edit':
        return isAnyOurMessage(msg, [c.issue].concat(c.issues), cb)
      default:
        cb()
    }
  }, 4)
}

function getFirstMessage (feedId, cb) {
  sbot_user_feed({id: feedId, gte: 0, limit: 1})(null, cb)
}
