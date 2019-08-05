var Pushable = require('pull-pushable')
module.exports = function () {
  return function () {
    var stream = Pushable(() => {
      clearInterval(timer)
    })
    var timer = setInterval(function () {
      stream.push(Date.now())
    }, 500)
    return stream
  }
}
