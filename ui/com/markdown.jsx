'use babel'
import React from 'react'
import markdown from 'ssb-markdown'
import ssbref from 'ssb-ref'
import mlib from 'ssb-msgs'

export class Block extends React.Component {
  render() {
    // extract mention names
    var mentionNames = {}
    mlib.links(this.props.msg.value.content.mentions, 'feed').forEach(link => {
      if (link.name && typeof link.name == 'string') {
        var name = (link.name.charAt(0) == '@') ? link.name : '@'+link.name
        mentionNames[name] = link.link
      }
    })

    const opts = {
      toUrl: ref => {
        // mentions
        if (ref in mentionNames)
          return '#/profile/'+encodeURIComponent(mentionNames[ref])

        // standard ssb-refs
        if (ssbref.isFeedId(ref))
          return '#/profile/'+encodeURIComponent(ref)
        else if (ssbref.isMsgId(ref))
          return '#/msg/'+encodeURIComponent(ref)
        else if (ssbref.isBlobId(ref))
          return 'http://localhost:7778/'+encodeURIComponent(ref)
        return false
      }
    }
    return <div className="markdown markdown-block" dangerouslySetInnerHTML={{__html: markdown.block(this.props.md, opts)}} />
  }
}
export class Inline extends React.Component {
  render() {
    return <span className="markdown markdown-inline" dangerouslySetInnerHTML={{__html: markdown.inline(this.props.md)}} />
  }
}
