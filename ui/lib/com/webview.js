var h        = require('hyperscript')
var muxrpc   = require('muxrpc')
var pull     = require('pull-stream')
var pushable = require('pull-pushable')
var ssbref   = require('ssb-ref')
var app      = require('../app')

var manifest = {
  'get'              : 'async',
  'getPublicKey'     : 'async',
  'whoami'           : 'async',
  'relatedMessages'  : 'async',
  'createFeedStream' : 'source',
  'createUserStream' : 'source',
  'createLogStream'  : 'source',
  'messagesByType'   : 'source',
  'links'            : 'source'
}

module.exports = function (opts) {
  if (!opts) throw "`opts` required in com.webview"

  var webview = h('webview', { src: opts.url, preload: './webview-preload.js' })

  // setup rpc

  var ssb = muxrpc(null, manifest, serialize)(app.ssb)
  function serialize (stream) { return stream }

  var rpcStream = ssb.createStream()
  var ipcPush = pushable()
  webview.addEventListener('ipc-message', function (e) {
    if (e.channel == 'navigate') {
      if (e.args[0] && ssbref.isLink(e.args[0]))
        window.location.hash = '#/webview/' + e.args[0]
      else
        console.warn('Security Error: page attempted to navigate to disallowed location,', e.args[0])
    }
    if (e.channel == 'muxrpc-ssb') {
      var msg = e.args[0]
      try { msg = JSON.parse(msg) }
      catch (e) { return }
      ipcPush.push(msg)
    }
  })
  pull(ipcPush, rpcStream, pull.drain(
    function (msg) { webview.send('muxrpc-ssb', JSON.stringify(msg)) },
    function (err) { if (err) { console.error(err) } }
  ))

  // sandboxing

  // dont let the webview navigate away
  webview.addEventListener('did-stop-loading', function (e) {
    if (webview.getUrl().indexOf('http://localhost') !== 0 && webview.getUrl().indexOf('data:') !== 0) {
      console.warn('Security Error. Webview circumvented navigation sandbox.')
      webview.src = 'data:text/html,<strong>Security Error</strong> This page attempted to navigate out of its sandbox through explicit circumvention. Do not trust it!'
    }
  })

  return webview
}