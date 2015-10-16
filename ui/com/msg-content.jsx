'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import schemas from 'ssb-msg-schemas'
import ssbref from 'ssb-ref'
import { MsgLink, UserLink } from './index'
import { Block as MdBlock, Inline as MdInline } from './markdown'
import { Table as PrettyRaw } from './pretty-raw'

export class Block extends React.Component {
  render() {
    let c = this.props.msg.value.content

    if (this.props.forceRaw)
      return <PrettyRaw key={this.props.msg.key} obj={c} />

    try {
      switch (c.type) {
        case 'post':
          if (c.text) return <MdBlock md={c.text} msg={this.props.msg} />
      }
    } catch (e) { console.warn(e) }

    return <PrettyRaw key={this.props.msg.key} obj={c} />
  }
}

export class Inline extends React.Component {
  render() {
    let c = this.props.msg.value.content

    if (this.props.forceRaw)
      return <span><code>{c.type}</code> message</span>

    try {
      switch (c.type) {
        case 'post':
          if (c.text) return <MdInline md={c.text} />
          break
      }
    } catch (e) { console.warn(e) }

    return <span><code>{c.type}</code> message</span>
  }
}