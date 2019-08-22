const PullPushable = require('pull-pushable')
const Abortable = require('pull-abortable')

module.exports = function PullPushAbort () {
  let aborter = Abortable()
  const stream = PullPushable(() => {
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
