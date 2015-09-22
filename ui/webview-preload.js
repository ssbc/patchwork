var ipc      = require('ipc')
var muxrpc   = require('muxrpc')
var pull     = require('pull-stream')
var pushable = require('pull-pushable')

// setup rpc connection with parent

var manifest = {
  'get'              : 'async',
  'whoami'           : 'async',
  'relatedMessages'  : 'async',
  'createFeedStream' : 'source',
  'createUserStream' : 'source',
  'createLogStream'  : 'source',
  'messagesByType'   : 'source',
  'links'            : 'source'
}

var ssb = muxrpc(manifest, null, serialize)()
function serialize (stream) { return stream }

var rpcStream = ssb.createStream()
var ipcPush = pushable()
ipc.on('muxrpc-ssb', function (msg) {
  try {
    if (typeof msg == 'string')
      msg = JSON.parse(msg)
  } catch (e) {
    return
  }
  ipcPush.push(msg)
})
pull(ipcPush, rpcStream, pull.drain(
  function (msg) { ipc.sendToHost('muxrpc-ssb', JSON.stringify(msg)) },
  function (err) { if (err) { console.error(err) } }
))

// sandbox

// prevent navigations through default behavior
var location = window.document.location
var preventNavigation = function (e) {
  var originalHashValue = location.hash
  window.setTimeout(function () {
    location.hash = 'preventNavigation' + ~~ (9999 * Math.random())
    location.hash = originalHashValue
  }, 0)
}
window.addEventListener('beforeunload', preventNavigation, false)
window.addEventListener('unload', preventNavigation, false)

// send navigations to the parent frame
window.addEventListener('click', function (e) {
  var el = e.target
  while (el) {
    if (el.tagName == 'A') {
      console.log('navigate', el.getAttribute('href'))
      ipc.sendToHost('navigate', el.getAttribute('href'))
      return
    }
    el = el.parentNode
  }
}, false)

// exports

window.pull = pull
window.ssb  = ssb