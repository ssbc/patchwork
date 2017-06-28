var pull = require('pull-stream')
var Pause = require('pull-pause')
var Value = require('mutant/value')
var onceIdle = require('mutant/once-idle')
var computed = require('mutant/computed')

module.exports = Scroller

function Scroller (scroller, content, render, cb) {
  var toRenderCount = Value(0)
  var toAppendCount = Value(0)

  var queueLength = computed([toRenderCount, toAppendCount], (a, b) => a + b)

  var pause = Pause(function () {})
  var running = true
  var appendQueue = []

  function appendLoop () {
    var distanceFromBottom = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight)
    if (distanceFromBottom < scroller.clientHeight) {
      while (appendQueue.length) {
        content.appendChild(appendQueue.shift())
      }
    }

    toAppendCount.set(appendQueue.length)
    if (queueLength() < 5) {
      // queue running low, resume stream
      pause.resume()
    }

    if (running || queueLength()) {
      window.requestAnimationFrame(appendLoop)
    }
  }

  var stream = pull(
    pause,
    pull.drain(function (msg) {
      toRenderCount.set(toRenderCount() + 1)

      onceIdle(() => {
        var element = render(msg)
        appendQueue.push(element)
        toRenderCount.set(toRenderCount() - 1)
      })

      if (queueLength() > 5) {
        pause.pause()
      }
    }, function (err) {
      running = false
      cb ? cb(err) : console.error(err)
    })
  )

  stream.queue = queueLength

  appendLoop()
  return stream
}
