const Pushable = require('pull-pushable')
module.exports = function () {
  return function () {
    const stream = Pushable(() => {
      clearInterval(timer)
    })
    const timer = setInterval(function () {
      stream.push(Date.now())
    }, 500)
    return stream
  }
}
