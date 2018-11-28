const pull = require('pull-stream')
const extend = require('xtend')
var Paramap = require('pull-paramap')

module.exports = function ({ ssb }) {
  return pull(
    Paramap((msg, cb) => {
      var type = msg.value && msg.value.content && msg.value.content.type
      if (type === 'gathering') {
        resolveGathering(msg, cb)
      } else {
        cb(null, msg)
      }
    }, 10)
  )

  function resolveGathering (msg, cb) {
    ssb.about.latestValues({
      keys: ['title', 'description', 'location', 'startDateTime', 'image'],
      dest: msg.key
    }, (err, gathering) => {
      if (err) return cb(err)
      ssb.about.socialValues({
        key: 'attendee',
        dest: msg.key
      }, (err, attending) => {
        if (err) return cb(err)
        gathering.attending = Object.keys(attending)
        cb(null, extend(msg, { gathering }))
      })
    })
  }
}
