var nest = require('depnest')
var getTimestamp = require('../../../lib/get-timestamp')

exports.gives = nest('message.sync.timestamp', true)

// get the asserted timestamp for a given message unless the message was
// received before the claimed time, then use receive time
// (handles clocks set into the future, and avoid received "3 mins from now" issue!)

exports.create = function (api) {
  return nest('message.sync.timestamp', function (msg) {
    return getTimestamp(msg)
  })
}
