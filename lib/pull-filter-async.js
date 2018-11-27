const pull = require('pull-stream')
const emptyMarker = {}
const Paramap = require('pull-paramap')

module.exports = function (fn, parallel) {
  return pull(
    Paramap((msg, cb) => {
      if (typeof fn === 'function') {
        fn(msg, (err, result) => {
          cb(err, result ? msg : emptyMarker)
        })
      } else {
        cb()
      }
    }, parallel),
    pull.filter(notEmpty)
  )
}

function notEmpty (item) {
  return item !== emptyMarker
}
