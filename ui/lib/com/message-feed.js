'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var pauser = require('pause-offscreen')
var app = require('../app')
var com = require('../com')
var u = require('../util')


module.exports = function (opts) {
  opts = opts || {}
  var botcursor
  var containerEl, feedEl
  var fetching = false

  if (!opts.feed)
    opts.feed = app.ssb.createFeedStream
  if (!opts.render)
    opts.render = com.message

  var cursor = opts.cursor
  if (!cursor) {
    cursor = function (msg) {
      if (msg)
        return [msg.value.timestamp, msg.value.author]
    }
  }

  // markup
 
  feedEl = h(opts.container||'.message-feed' + com.filterClasses())
  containerEl = h('.message-feed-container', feedEl)

  // message fetch

  fetchBottom(function (n) {
    if (opts.onempty && n === 0)
      opts.onempty(feedEl)

    // add offscreen pausing
    var unlistenPauser = pauser(containerEl)
    ui.onTeardown(unlistenPauser)
  })

  function fetchBottom (cb) {
    if (fetching) return
    fetching = true

    var numRendered = 0
    fetchBottomBy(opts.limit||30)
    function fetchBottomBy (amt) {
      var lastmsg
      var renderedKeys = []
      pull(
        opts.feed({ reverse: true, limit: amt||30, lt: cursor(botcursor) }),
        pull.drain(function (msg) {
          lastmsg = msg

          // filter
          if (opts.filter && !opts.filter(msg))
            return

          // render
          var el = opts.render(msg)
          if (el) {
            feedEl.appendChild(el)
            renderedKeys.push(msg.key)
            numRendered++
          }
        }, function (err) {
          if (err)
            console.warn('Error while fetching messages', err)

          // nothing new? stop
          if (!lastmsg || (botcursor && botcursor.key == lastmsg.key)) {
            fetching = false
            return (cb && cb(numRendered))
          }
          botcursor = lastmsg

          if (opts.markread)
            app.ssb.patchwork.markRead(renderedKeys)

          // fetch more if needed
          var remaining = amt - renderedKeys.length
          if (remaining > 0 && !opts.onefetch)
            return fetchBottomBy(remaining)

          // we're done
          fetching = false
          cb && cb(numRendered)
        })
      )
    }
  }

  if (opts.live) {
    pull(
      opts.live,
      pull.drain(function (msg) {
        // filter
        if (opts.filter && !opts.filter(msg))
          return

        // render
        var el = opts.render(msg)
        if (el) {
          feedEl.insertBefore(el, feedEl.firstChild)
          if (opts.markread)
            app.ssb.patchwork.markRead(msg.key)
        }
      })
    )
  }

  // behaviors

  if (opts.infinite) {
    window.onscroll = function (e) {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
        // hit bottom
        fetchBottom()
      }
    }
  }

  return containerEl
}