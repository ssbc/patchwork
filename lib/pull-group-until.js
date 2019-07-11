module.exports = function GroupUntil (check) {
  var ended = false
  var queue = []
  return function (read) {
    return function (end, cb) {
      // this means that the upstream is sending an error.
      if (end) {
        ended = end
        return read(ended, cb)
      }
      // this means that we read an end before.
      if (ended) return cb(ended)

      read(null, function next (end, data) {
        ended = ended || end

        if (ended) {
          if (!queue.length) {
            return cb(ended)
          }

          const _queue = queue
          queue = []
          return cb(null, _queue)
        }

        if (check(queue, data)) {
          queue.push(data)
          read(null, next)
        } else {
          const _queue = queue
          queue = [data]
          cb(null, _queue)
        }
      })
    }
  }
}
