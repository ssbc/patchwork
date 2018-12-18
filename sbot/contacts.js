var PullPushable = require('pull-pushable')
var pull = require('pull-stream')
var Abortable = require('pull-abortable')

exports.manifest = {
  hopStream: 'source',
  statusStream: 'source',
  ignoreStream: 'source'
}

exports.init = function (ssb, config) {
  return {
    ignoreStream: function ({ live }, cb) {
      // return a list of everyone you have blocked privately
      var aborter = Abortable()
      var ended = false
      var stream = PullPushable(() => {
        if (aborter) {
          aborter.abort()
          aborter = null
        }
        ended = true
      })

      var result = {}
      var sync = null

      pull(
        ssb.query.read({
          query: [{ $filter: {
            value: {
              author: ssb.id,
              content: {
                type: 'contact'
              }
            }
          } }],
          private: true,
          live
        }),
        aborter,
        pull.drain((msg) => {
          if (msg.sync) {
            sync = true
            if (live) {
              stream.push(result)
            }
            return
          }

          var isPrivate = msg.value && msg.value.meta && msg.value.meta.private
          var content = msg.value.content

          // if a non-private state has been set since last private, revert to null
          // patchwork will always try to set a new ignore status after the public if it differs
          // this is just to handle the case where the private state was set by another client
          // (which will override ignore due to the way ssb-friends handles private blocks)

          var value = isPrivate ? !!content.blocking : null

          if (sync) {
            stream.push({ [content.contact]: value })
          } else {
            result[content.contact] = value
          }
        }, (err) => {
          if (err) return stream.end(err)
          if (ended || sync) return

          if (!live) {
            stream.push(result)
          }

          stream.end()
        })
      )

      return stream
    },
    statusStream: function ({ feedId, live }, cb) {
      var aborter = Abortable()
      var ended = false
      var stream = PullPushable(() => {
        if (aborter) {
          aborter.abort()
          aborter = null
        }
        ended = true
      })

      var result = {}
      var sync = null

      pull(
        ssb.query.read({
          query: [{ $filter: {
            value: {
              author: feedId,
              content: {
                type: 'contact'
              }
            }
          } }],
          live
        }),
        aborter,
        pull.filter(msg => (msg.value && msg.value.content && msg.value.content.type) || msg.sync),
        pull.drain((msg) => {
          if (msg.sync) {
            sync = true
            if (live) {
              stream.push(result)
            }
            return
          }

          var isPrivate = msg.value && msg.value.meta && msg.value.meta.private

          if (!isPrivate) {
            var content = msg.value.content
            var value = content.blocking
              ? false
              : content.following
                ? true
                : null

            if (sync) {
              stream.push({ [content.contact]: value })
            } else {
              result[content.contact] = value
            }
          }
        }, (err) => {
          if (err) return stream.end(err)
          if (ended || sync) return

          if (!live) {
            stream.push(result)
          }

          stream.end()
        })
      )

      return stream
    },
    hopStream: function ({ feedId, live, max = 1, reverse = false }) {
      var release = null
      var ended = false
      var stream = PullPushable(() => {
        if (release) {
          release()
          release = null
        }
        ended = true
      })

      ssb.friends.hops({ start: feedId, max, reverse }, (err, hops) => {
        if (err) return stream.end(err)
        if (ended) return

        var result = {}
        for (var k in hops) {
          if (checkFilter(hops[k], { max })) {
            result[k] = hops[k]
          }
        }

        stream.push(result)

        if (live) {
          release = ssb.friends.onEdge((from, to, value) => {
            if (checkFilter(value, { max })) {
              if (!reverse && from === feedId) {
                stream.push({ [to]: value })
              } else if (reverse && to === feedId) {
                stream.push({ [from]: value })
              }
            }
          }, { hackAroundBugInHookOptionalCB: true })
        } else {
          stream.end()
        }
      })

      return stream
    }
  }
}

function checkFilter (value, { max }) {
  return (max == null || Math.abs(value) <= Math.abs(max))
}
