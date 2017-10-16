module.exports = function (ssb, config) {
  return function getHops ({from, to}, cb) {
    ssb.friends.hops(from, (err, result) => {
      if (err) return cb(err)
      ssb.friends.hops(to, (err, reverseResult) => {
        if (err) return cb(err)
        cb(null, [result[to], reverseResult[from]])
      })
    })
  }
}
