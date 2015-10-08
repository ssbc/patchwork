'use babel'
import React from 'react'
import { Block as MdBlock } from './markdown'
//import suggestBox from 'suggest-box'
import schemas from 'ssb-msg-schemas'
import mlib from 'ssb-msgs'
import app from '../lib/app'
import mentionslib from '../lib/mentions'
import social from '../lib/social-graph'

class ComposerAudience extends React.Component {
  render() {
    if (this.props.isReadOnly)
      return <div><strong>{this.props.isPublic ? 'Public' : 'Private' }</strong></div>
    
    let pubBtn = ( this.props.isPublic) ? <strong>Public</strong> : <a onClick={this.props.onSetPublic}>Public</a>
    let priBtn = (!this.props.isPublic) ? <strong>Private</strong> : <a onClick={this.props.onSetPrivate}>Private</a>
    return <div>{pubBtn} or {priBtn}</div>
  }
}

class ComposerRecps extends React.Component {
  render() {
    if (this.props.isPublic)
      return <div/>
    return <div><input type="text" /></div>
  }
}

export default class Composer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isPublic: true,
      isPreviewing: false,
      isSending: false,
      text: ''
    }

    // thread info
    this.threadRoot = null
    this.threadBranch = null
    this.threadRecps = null
    if (this.props.thread) {
      // root and branch links
      this.threadRoot = this.props.thread.key
      this.threadBranch = getLastThreadPost(this.props.thread).key

      // extract encryption recipients from thread
      if (Array.isArray(this.props.thread.value.content.recps)) {
        this.threadRecps = mlib.links(this.props.thread.value.content.recps)
          .map(function (recp) { return recp.link })
          .filter(Boolean)
      }
    }

    this.audienceHandlers = {
      onSetPublic: ()  => { this.setState({ isPublic: true  }) },
      onSetPrivate: () => { this.setState({ isPublic: false }) }
    }
  }

  onChangeText(e) {
    this.setState({ text: e.target.value })
  }

  onAttach() {
    alert('todo')
  }

  onTogglePreview() {
    this.setState({ isPreviewing: !this.state.isPreviewing })
  }

  canSend() {
    return !!this.state.text.trim()
  }

  onSend() {
    var text = this.state.text
    if (!text.trim())
      return

    this.setState({ isSending: true })

    // prep text
    mentionslib.extract(text, (err, mentions) => {
      if (err) {
        this.setState({ isSending: false })
        // :TODO:
        // if (err.conflict)
        //   modals.error('Error While Publishing', 'You follow multiple people with the name "'+err.name+'." Resolve this before publishing.')
        // else
        //   modals.error('Error While Publishing', err, 'This error occured while trying to extract the mentions from a new post.')
        return
      }

      // post
      var post = schemas.post(text, this.threadRoot, this.threadBranch, mentions, this.threadRecps)
      console.log(post)
      return

      if (recps)
        app.ssb.private.publish(post, recps, published)
      else
        app.ssb.publish(post, published)

      function published (err, msg) {
        this.setState({ isSending: false })
        if (err) modals.error('Error While Publishing', err, 'This error occurred while trying to publish a new post.')
        else {
          this.setState({ value: '' })
          app.ssb.patchwork.markRead(msg.key)
        }
      }
    })
  }

  render() {
    let isPublic = this.props.thread ? isThreadPublic(this.props.thread) : this.state.isPublic
    return <div>
      <ComposerAudience isPublic={isPublic} isReadOnly={!!this.props.thread} {...this.audienceHandlers} />
      <ComposerRecps isPublic={isPublic} isReadOnly={!!this.props.thread} />
      <div>
        { this.state.isPreviewing ?
          <MdBlock md={this.state.text} /> :
          <textarea value={this.state.text} onChange={this.onChangeText.bind(this)} /> }
      </div>
      <div>
        <div><a onClick={this.onAttach.bind(this)}>Add an attachment</a></div>
        <div><a onClick={this.onTogglePreview.bind(this)}>{this.state.isPreviewing ? 'Edit' : 'Preview'}</a></div>
        <div>{(!this.canSend() || this.state.isSending) ? <em>Send</em> : <a onClick={this.onSend.bind(this)}>Send</a>}</div>
      </div>
    </div>
  }
}

function isThreadPublic (thread) {
  if ('plaintext' in thread)
    return thread.plaintext
  return (typeof thread.value.content !== 'string')
}

function getLastThreadPost (thread) {
  var msg = thread
  if (!thread.related)
    return msg
  thread.related.forEach(function (r) {
    if (r.value.content.type === 'post')
      msg = r
  })
  return msg
}