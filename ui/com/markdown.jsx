'use babel'
import React from 'react'
import markdown from 'ssb-markdown'
import ssbref from 'ssb-ref'

function ssbRefToUrl (ref) {
  if (ssbref.isFeedId(ref))
    return '#/profile/'+encodeURIComponent(ref)
  else if (ssbref.isMsgId(ref))
    return '#/msg/'+encodeURIComponent(ref)
  else if (ssbref.isBlobId(ref))
    return 'http://localhost:7778/'+encodeURIComponent(ref)
  return ''
}

export class Block extends React.Component {
  render() {
    const opts = {
      mentionNames: this.props.msg,
      ssbRefToUrl
    }
    return <div className="markdown markdown-block" dangerouslySetInnerHTML={{__html: markdown.block(this.props.md, opts)}} />
  }
}
export class Inline extends React.Component {
  render() {
    const opts = {
      ssbRefToUrl
    }
    return <span className="markdown markdown-inline" dangerouslySetInnerHTML={{__html: markdown.inline(this.props.md, opts)}} />
  }
}
