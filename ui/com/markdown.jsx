'use babel'
import React from 'react'
import markdown from 'ssb-markdown'

export class Block extends React.Component {
  render() {
    return <div className="markdown markdown-block" dangerouslySetInnerHTML={{__html: markdown.block(this.props.md, this.props.msg)}} />
  }
}
export class Inline extends React.Component {
  render() {
    return <span className="markdown markdown-inline" dangerouslySetInnerHTML={{__html: markdown.inline(this.props.md)}} />
  }
}
