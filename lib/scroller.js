const pull = require('pull-stream')
const Pause = require('pull-pause')
const { h, computed, Value } = require('mutant')

module.exports = Scroller

function Scroller (scroller, content, render, opts) {
  if (typeof opts === 'function') {
    opts = { onDone: opts }
  } else if (!opts) {
    opts = {}
  }
  const toRenderCount = Value(0)
  const toAppendCount = Value(0)
  const waitingForItems = Value(false)
  const pauser = Pause(function () {})

  const endMarker = h('div.endMarker')
  let intersecting = false
  content.appendChild(endMarker)

  const endlessObserver = new window.IntersectionObserver((entries) => {
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

  const visibleObserver = new window.IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        visibleObserver.unobserve(entry.target)
        process.nextTick(() => opts.onItemVisible && opts.onItemVisible(entry.target))
      }
    })
  }, {
    root: scroller
  })

  endlessObserver.observe(endMarker)

  const queueLength = computed([toRenderCount, toAppendCount], (a, b) => a + b)

  const appendQueue = []
  let flushing = false
  let running = true

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
      const element = appendQueue.shift()
      content.insertBefore(element, endMarker)

      // notify when this element comes into view (for mark as read)
      visibleObserver.observe(element)
    }

    toAppendCount.set(appendQueue.length)

    // oops, looks like we need more items!
    if (queueLength() < 5 && intersecting) {
      pauser.resume()
    }

    if (running === false && !queueLength()) {
      // we're done already!
      waitingForItems.set(false)
    }
  }

  const stream = pull(
    pauser,
    pull.drain(function (msg) {
      toRenderCount.set(toRenderCount() + 1)

      process.nextTick(() => {
        // render post when idle
        const element = render(msg)
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
