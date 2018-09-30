var nest = require('depnest')
var ref = require('ssb-ref')
var MutantArray = require('mutant/array')
var concat = require('mutant/concat')

var { computed } = require('mutant')

exports.needs = nest({
  'message.sync.unbox': 'first',
  'backlinks.obs.for': 'first'
})

exports.gives = nest({
  'sbot.hook.publish': true,
  'message.obs.likes': true
})

exports.create = function (api) {
  var activeLikes = new Set()
  return nest({
    'sbot.hook.publish': (msg) => {
      if (!(msg && msg.value && msg.value.content)) return
      if (typeof msg.value.content === 'string') {
        msg = api.message.sync.unbox(msg)
        if (!msg) return
      }

      var c = msg.value.content
      if (c.type !== 'vote') return
      if (!c.vote || !c.vote.link) return

      activeLikes.forEach((likes) => {
        if (likes.id === c.vote.link) {
          likes.push(msg)
        }
      })
    },
    'message.obs.likes': (id) => {
      if (!ref.isLink(id)) throw new Error('an id must be specified')
      var obs = get(id)
      obs.id = id
      var result = computed(obs, getLikes, {
        // allow manual append for simulated realtime
        onListen: () => activeLikes.add(obs),
        onUnlisten: () => activeLikes.delete(obs)
      })
      result.sync = obs.sync
      return result
    }
  })

  function get (id) {
    var backlinks = api.backlinks.obs.for(id)
    var merge = MutantArray()

    var likes = computed([backlinks.sync, concat([backlinks, merge])], (sync, backlinks) => {
      if (sync) {
        return backlinks.reduce((result, msg) => {
          var c = msg.value.content
          if (c.type === 'vote' && c.vote && c.vote.link === id) {
            var value = result[msg.value.author]
            if (!value || value[0] < msg.value.timestamp) {
              result[msg.value.author] = [msg.value.timestamp, c.vote.value, c.vote.expression]
            }
          }
          return result
        }, {})
      } else {
        return {}
      }
    })

    likes.push = merge.push
    likes.sync = backlinks.sync
    return likes
  }
}

function getLikes (likes) {
  return Object.keys(likes).reduce((result, id) => {
    if (likes[id][1] > 0) {
      result.push(id)
    }
    return result
  }, [])
}
