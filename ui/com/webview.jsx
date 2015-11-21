'use babel'
import React    from 'react'
import muxrpc   from 'muxrpc'
import pull     from 'pull-stream'
import pushable from 'pull-pushable'
import ssbref   from 'ssb-ref'
import app      from '../lib/app'

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

export default class WebView extends React.Component {
  componentDidMount() {
    this.hasSetupWebviewEl = false
    this.setupWebviewEl()
  }
  componentDidUpdate() {
    this.setupWebviewEl()
  }
  setupWebviewEl() {
    var webviewEl = this.refs && this.refs.wv
    if (!webviewEl)
      return

    // fix the height
    webviewEl.querySelector('::shadow object').style.height = this.props.height + 'px'

    // the rest is one-time
    if (this.hasSetupWebviewEl)
      return
    this.hasSetupWebviewEl = true

    // setup rpc
    var ssb = muxrpc(null, manifest, serialize)(app.ssb)
    function serialize (stream) { return stream }

    var rpcStream = ssb.createStream()
    var ipcPush = pushable()
    webviewEl.addEventListener('ipc-message', function (e) {
      if (e.channel == 'navigate') {
        if (e.args[0] && ssbref.isLink(e.args[0]))
          window.location.hash = '#/webview/' + encodeURIComponent(e.args[0])
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
    webviewEl.addEventListener('did-stop-loading', function (e) {
      if (webviewEl.getUrl().indexOf('http://localhost') !== 0 && webviewEl.getUrl().indexOf('data:') !== 0) {
        console.warn('Security Error. Webview circumvented navigation sandbox.')
        webviewEl.src = 'data:text/html,<strong>Security Error</strong> This page attempted to navigate out of its sandbox through explicit circumvention. Do not trust it!'
      }
    })
  }
  render() {
    return <webview ref="wv" src={this.props.url} preload="./webview-preload.js" style={{height: this.props.height}} />
  }
}