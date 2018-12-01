var PullPushable = require('pull-pushable')

exports.manifest = {
  hopStream: 'source'
}

exports.init = function (ssb, config) {
  return {
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
