'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import schemas from 'ssb-msg-schemas'
import ssbref from 'ssb-ref'
import { MsgLink, UserLink } from './index'
import { Block as MdBlock, Inline as MdInline } from './markdown'
import { Table as TableRaw, Div as DivRaw } from './pretty-raw'
import social from '../lib/social-graph'
import u from '../lib/util'


//return <TableRaw key={id} id={id} obj={c} />
function rawAttrString(msg) {
  return <code><pre>
    { JSON.stringify( Object.assign({id: msg.key}, msg.value), null, 2 ) }
  </pre></code>
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
          var contact = c.contact ? mlib.link(c.contact).link : undefined
          if (contact === app.user.id) {
            if (c.following) {
              if (!social.follows(app.user.id, author))
                return <div><i className="fa fa-user-plus" /> <UserLink id={author} /> has followed you. Follow back?</div>
              else
                return <div><i className="fa fa-user-plus" /> <UserLink id={author} /> has joined your contacts.</div>
            } else {
              return <div><i className="fa fa-user-times" /> <UserLink id={author} /> has stopped following you.</div>
            }
          } else {
            if (c.following)
              return <div><i className="fa fa-user-plus" /> <UserLink id={author} /> has followed {u.getName(contact)}.</div>
            else
              return <div><i className="fa fa-user-times" /> <UserLink id={author} /> has stopped following {u.getName(contact)}.</div>
          }
          break
      }
    } catch (e) { console.warn(e) }

    return rawAttrString(msg)
  }
}

export class Inline extends React.Component {
  render() {
    const author = this.props.msg.value.author
    const c = this.props.msg.value.content

    if (this.props.forceRaw)
      return <DivRaw key={this.props.msg.key} obj={c} />

    try {
      switch (c.type) {
        case 'post':
          if (c.text) return <MdInline md={c.text} />
          break
        case 'contact':
          var contact = mlib.link(c.contact).link
          if (contact === app.user.id) {
            if (c.following) {
              if (!social.follows(app.user.id, author))
                return <div><i className="fa fa-user-plus" /> {u.getName(author)} has followed you. Follow back?</div>
              else
                return <div><i className="fa fa-user-plus" /> {u.getName(author)} has joined your contacts.</div>
            } else {
              return <div><i className="fa fa-user-times" /> {u.getName(author)} has stopped following you.</div>
            }
          } else {
            if (c.following)
              return <div><i className="fa fa-user-plus" /> {u.getName(author)} has followed {u.getName(contact)}.</div>
            else
              return <div><i className="fa fa-user-times" /> {u.getName(author)} has stopped following {u.getName(contact)}.</div>
          }
          break
      }
    } catch (e) { console.warn(e) }

    return <DivRaw key={this.props.msg.key} obj={c} />
  }
}
