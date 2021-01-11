const pull = require('pull-stream')

exports.manifest = {
  read: 'source',
  countStream: 'source',
  feedLikesMsgStream: 'source',
  get: 'async'
}

exports.init = function (ssb) {
  return {
    read,
    feedLikesMsgStream: function ({ feedId, msgId }) {
      let value = false
      let sync = false
      return pull(
        ssb.backlinks.read({
          live: true,
          query: [{
            $filter: {
              dest: msgId,
              value: {
                author: feedId,
                content: { type: 'vote', vote: { link: msgId } }
              }
            }
          }]
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
          return null
        }),
        pull.filter(present)
      )
    },
    get: function ({ dest }, cb) {
      const ids = new Set()
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
      const ids = new Set()
      let sync = false
      return pull(
        read({ dest, live: true }),
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
          return null
        }),
        pull.filter(present)
      )
    }
  }

  function read ({
    reverse = false,
    limit = null,
    live = null,
    dest = null
  }) {
    return pull(
      ssb.backlinks.read({
        reverse,
        live,
        limit,
        query: [{
          $filter: {
            dest,
            value: { content: { type: 'vote', vote: { link: dest } } }
          }
        }]
      })
    )
  }
}

function present (value) {
  return value != null
}
