var pull = require('pull-stream')
var Pause = require('pull-pause')
var Value = require('mutant/value')
var onceIdle = require('mutant/once-idle')
var computed = require('mutant/computed')

module.exports = Scroller

function Scroller (scroller, content, render, opts) {
  if (typeof opts === 'function') {
    opts = {onDone: opts}
  } else if (!opts) {
    opts = {}
  }
  var toRenderCount = Value(0)
  var toAppendCount = Value(0)
  var pendingVisible = new Set()

  var queueLength = computed([toRenderCount, toAppendCount], (a, b) => a + b)

  var pause = Pause(function () {})
  var running = true
  var appendQueue = []

  function appendLoop () {
    var distanceFromBottom = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight)
    if (distanceFromBottom < scroller.clientHeight) {
      while (appendQueue.length) {
        var element = appendQueue.shift()
        content.appendChild(element)
        pendingVisible.add(element)
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
      clearInterval(visibleInterval)
      opts.onDone ? opts.onDone(err) : console.error(err)
    })
  )

  var visibleInterval = setInterval(() => {
    // check for visible items every 2 seconds
    Array.from(pendingVisible).forEach(checkVisible)
  }, 2000)

  stream.queue = queueLength

  appendLoop()
  return stream

  function checkVisible (element) {
    var height = scroller.clientHeight
    var rect = element.getBoundingClientRect()
    if (height > 50 && rect.bottom < height) {
      pendingVisible.delete(element)
      if (opts.onItemVisible) {
        onceIdle(() => opts.onItemVisible(element))
      }
    }
  }
}
