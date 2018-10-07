var pull = require('pull-stream')
var Pause = require('pull-pause')
var { h, onceIdle, computed, Value } = require('mutant')

window.stopIt = false

module.exports = Scroller

function Scroller (scroller, content, render, opts) {
  if (typeof opts === 'function') {
    opts = { onDone: opts }
  } else if (!opts) {
    opts = {}
  }
  var toRenderCount = Value(0)
  var toAppendCount = Value(0)
  var waitingForItems = Value(false)
  var pauser = Pause(function () {})

  var endMarker = h('div.endMarker')
  var intersecting = false
  content.appendChild(endMarker)

  var endlessObserver = new window.IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      // end marker is inside margin, request more items
      intersecting = true
      if (running) {
        waitingForItems.set(true)
        pauser.resume()
      }
    } else {
      // end marker is no longer inside margin, stop appending items
      intersecting = false
      waitingForItems.set(false)
    }
  }, {
    root: scroller,
    // preload at least 4 screens ahead
    rootMargin: '0px 0px 400% 0px'
  })

  var visibleObserver = new window.IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        visibleObserver.unobserve(entry.target)
        onceIdle(() => opts.onItemVisible(entry.target))
      }
    })
  }, {
    root: scroller
  })

  endlessObserver.observe(endMarker)

  var queueLength = computed([toRenderCount, toAppendCount], (a, b) => a + b)

  var appendQueue = []
  var flushing = false
  var running = true

  function queueAppend (element) {
    // only call appendNow a maximum of once per frame
    appendQueue.push(element)
    toAppendCount.set(appendQueue.length)

    if (!flushing) {
      flushing = true
      window.requestAnimationFrame(appendNow)
    }
  }

  function appendNow () {
    flushing = false
    while (appendQueue.length) {
      var element = appendQueue.shift()
      content.insertBefore(element, endMarker)

      // notify when this element comes into view (for mark as read)
      visibleObserver.observe(element)
    }

    toAppendCount.set(appendQueue.length)

    // oops, looks like we need more items!
    if (queueLength() < 5 && intersecting) {
      pauser.resume()
    }

    if (!running && !queueLength()) {
      // we're done already!
      waitingForItems.set(false)
    }
  }

  var stream = pull(
    pauser,
    pull.drain(function (msg) {
      toRenderCount.set(toRenderCount() + 1)

      onceIdle(() => {
        // render post when idle
        var element = render(msg)
        queueAppend(element)
        toRenderCount.set(toRenderCount() - 1)
      })

      if (queueLength() > 5 || !intersecting) {
        // stop feeding the queue if greater than 5
        pauser.pause()
      }
    }, function (err) {
      running = false
      if (!queueLength()) waitingForItems.set(false)
      opts.onDone ? opts.onDone(err) : console.error(err)
    })
  )

  stream.waiting = waitingForItems
  stream.queue = queueLength

  return stream
}
