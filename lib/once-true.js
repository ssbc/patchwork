var watch = require('@mmckegg/mutant/watch')
module.exports = function onceTrue (value, fn) {
  var done = false
  var release = watch(value, (v) => {
    if (v && !done) {
      done = true
      setImmediate(doRelease)
      fn(v)
    }
  }, { nextTick: true })

  return release

  function doRelease () {
    release()
  }
}
