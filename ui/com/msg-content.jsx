'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import schemas from 'ssb-msg-schemas'
import ssbref from 'ssb-ref'
import { MsgLink, UserLink } from 'patchkit/common'
import { Block as MdBlock, Inline as MdInline } from 'patchkit/markdown'
import { Table as TableRaw, Div as DivRaw } from 'patchkit/pretty-raw'
import social from '../lib/social-graph'
import u from '../lib/util'

function rawAttrString(msg) {
  return <div className='raw-message'><pre><code>
    { JSON.stringify( Object.assign({id: msg.key}, msg.value), null, 2 ) }
  </code></pre></div>
}

export class Block extends React.Component {
  render() {
    const msg = this.props.msg
    const author = msg.value.author
    const c = msg.value.content

    if (this.props.forceRaw) return rawAttrString(msg)

    try {
      switch (c.type) {
        case 'post':
          if (c.text) return <MdBlock md={c.text} msg={this.props.msg} />
          break

        case 'contact':
          const result = renderContact(msg)
          if (result)
            return result
          break
      }
    } catch (e) { console.warn(e) }

    return rawAttrString(msg)
  }
}

export class Inline extends React.Component {
  render() {
    const msg = this.props.msg
    const author = msg.value.author
    const c = msg.value.content

    if (this.props.forceRaw)
      return <DivRaw key={msg.key} obj={c} />

    try {
      switch (c.type) {
        case 'post':
          if (c.text) {
            const text = this.props.limit ? u.shortString(c.text, this.props.limit) : c.text
            return <MdInline md={text} />
          }
          break
        case 'contact':
          const result = renderContact(msg)
          if (result)
            return result
          break
      }
    } catch (e) { console.warn(e) }

    return <DivRaw key={msg.key} obj={c} />
  }
}

function renderContact (msg) {
  const author = msg.value.author
  const c = msg.value.content  
  const contact = c.contact ? mlib.link(c.contact).link : undefined
  if (contact === app.user.id) {
    if (c.following) {
      if (!social.follows(app.user.id, author))
        return <div><i className="fa fa-user-plus" /> <UserLink id={author} /> has followed you. Follow back?</div>
      else
        return <div><i className="fa fa-user-plus" /> <UserLink id={author} /> is now your friend.</div>
    } else {
      return <div><i className="fa fa-user-times" /> <UserLink id={author} /> has stopped following you.</div>
    }
  } else {
    if (c.following)
      return <div><i className="fa fa-user-plus" /> <UserLink id={author} /> has followed {u.getName(contact)}.</div>
    else
      return <div><i className="fa fa-user-times" /> <UserLink id={author} /> has stopped following {u.getName(contact)}.</div>
  }
}