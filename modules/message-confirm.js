var lightbox = require('hyperlightbox')
var h = require('../lib/h')
var plugs = require('patchbay/plugs')
var get_id = plugs.first(exports.get_id = [])
var publish = plugs.first(exports.sbot_publish = [])
var message_render = plugs.first(exports.message_render = [])

exports.message_confirm = function (content, cb) {
  cb = cb || function () {}

  var lb = lightbox()
  document.body.appendChild(lb)

  var msg = {
    value: {
      author: get_id(),
      previous: null,
      sequence: null,
      timestamp: Date.now(),
      content: content
    }
  }

  var okay = h('button', {
    'ev-click': function () {
      lb.remove()
      publish(content, cb)
    },
    'ev-keydown': function (ev) {
      if (ev.keyCode === 27) cancel.click() // escape
    }
  }, [
    'okay'
  ])

  var cancel = h('button', {'ev-click': function () {
    lb.remove()
    cb(null)
  }}, [
    'Cancel'
  ])

  lb.show(h('MessageConfirm', [
    h('section', [
      message_render(msg)
    ]),
    h('footer', [okay, cancel])
  ]))

  okay.focus()
}
