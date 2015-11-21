'use babel'
import React from 'react'
import ssbref from 'ssb-ref'
import WebView from '../com/webview'
import { verticalFilled } from '../com'
import u from '../lib/util'

var WebViewVertical = verticalFilled(WebView)

export default class Msg extends React.Component {
  render() {
    var param = decodeURIComponent(this.props.params.id)
    var port = (ssbref.isLink(param)) ? 7777 : 7778
    var url = 'http://localhost:' + port + '/' + param

    return <div className="webview">
      <WebViewVertical url={url} />
    </div>
  }
}