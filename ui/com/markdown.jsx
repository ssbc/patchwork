'use babel'
import React from 'react'
import markdown from '../lib/markdown'

export class Block extends React.Component {
  render() {
    return <div dangerouslySetInnerHTML={{__html: markdown.block(this.props.md, this.props.msg)}} />
  }
}
export class Inline extends React.Component {
  render() {
    return <span dangerouslySetInnerHTML={{__html: markdown.inline(this.props.md)}} />
  }
}