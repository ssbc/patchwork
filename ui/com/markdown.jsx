'use babel'
import React from 'react'
import markdown from '../lib/markdown'

export class Block extends React.Component {
  render() {
    return <div className="markdown markdown-block" dangerouslySetInnerHTML={{__html: markdown.block(this.props.md, this.props.msg)}} />
  }
}
export class Inline extends React.Component {
  render() {
    return <span className="markdown markdown-inline" dangerouslySetInnerHTML={{__html: limit(markdown.inline(this.props.md), this.props.limit)}} />
  }
}

function limit (str, n) {
  if (!n) return str
  if (str && str.length > n)
    return str.slice(0, n-3) + '...'
  return str
}