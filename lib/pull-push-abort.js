const PullPushable = require('pull-pushable')
const Abortable = require('pull-abortable')

module.exports = function PullPushAbort () {
  var aborter = Abortable()
  var stream = PullPushable(() => {
    if (aborter) {
      aborter.abort()
      aborter = null
    }
    stream.ended = true
  })

  stream.aborter = aborter
  stream.ended = false

  return stream
}
