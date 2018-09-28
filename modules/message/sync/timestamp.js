var nest = require('depnest')

exports.gives = nest('message.sync.timestamp', true)

// get the asserted timestamp for a given message unless the message was
// received before the claimed time, then use recieve time
// (handles clocks set into the future, and avoid received "3 mins from now" issue!)

exports.create = function (api) {
  return nest('message.sync.timestamp', function (msg) {
    if (!msg || !msg.value || !msg.value.timestamp) return
    if (msg.timestamp) {
      return Math.min(msg.timestamp, msg.value.timestamp)
    } else {
      return msg.value.timestamp
    }
  })
}
