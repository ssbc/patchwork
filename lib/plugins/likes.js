var pull = require('pull-stream')

exports.manifest = {
  read: 'source',
  countStream: 'source',
  feedLikesMsgStream: 'source',
  get: 'async'
}

exports.init = function (ssb, config) {
  return {
    read,
    feedLikesMsgStream: function ({ feedId, msgId }) {
      var value = false
      var sync = false
      return pull(
        ssb.backlinks.read({
          live: true,
          query: [{ $filter: {
            dest: msgId,
            value: {
              author: feedId,
              content: { type: 'vote', vote: { link: msgId } }
            }
          } }]
        }),
        pull.map((msg) => {
          if (msg.sync) {
            sync = true
            return value
          }

          const vote = msg.value.content.vote
          if (vote) {
            value = vote.value > 0
            if (sync) return value
          }
        }),
        pull.filter(present)
      )
    },
    get: function ({ dest }, cb) {
      var ids = new Set()
      pull(
        read({ dest }),
        pull.drain(msg => {
          const author = msg.value.author
          const vote = msg.value.content.vote
          if (vote) {
            if (vote.value > 0) {
              ids.add(author)
            } else {
              ids.delete(author)
            }
          }
        }, (err) => {
          if (err) return cb(err)
          cb(null, Array.from(ids))
        })
      )
    },
    countStream: function ({ dest }) {
      var ids = new Set()
      var sync = false
      return pull(
        read({ dest, live: true, old: true }),
        pull.map(msg => {
          if (msg.sync) {
            sync = true
            return ids.size
          }

          const author = msg.value.author
          const vote = msg.value.content.vote
          if (vote) {
            if (vote.value > 0) {
              ids.add(author)
            } else {
              ids.delete(author)
            }
          }

          if (sync) {
            return ids.size
          }
        }),
        pull.filter(present)
      )
    }
  }

  function read ({
    reverse = false,
    limit = null,
    live = null,
    old = null,
    dest = null
  }) {
    return pull(
      ssb.backlinks.read({
        reverse,
        live,
        limit,
        query: [{ $filter: {
          dest,
          value: { content: { type: 'vote', vote: { link: dest } } }
        } }]
      })
    )
  }
}

function present (value) {
  return value != null
}
