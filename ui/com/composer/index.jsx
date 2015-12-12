'use babel'
import React from 'react'
import suggestBox from 'suggest-box'
import schemas from 'ssb-msg-schemas'
import mlib from 'ssb-msgs'
import threadlib from 'patchwork-threads'
import mime from 'mime-types'
import multicb from 'multicb'
import { RECP_LIMIT, ComposerRecps } from './recps'
import Modal from '../modals/popup'
import { Block as MarkdownBlock } from '../markdown'
import { verticalFilled, rainbow } from '../index'
import u from '../../lib/util'
import app from '../../lib/app'
import mentionslib from '../../lib/mentions'

const MarkdownBlockVerticalFilled = verticalFilled(MarkdownBlock)

class ComposerTextareaFixed extends React.Component {
  componentDidMount() {
    // setup the suggest-box
    let textarea = this.refs && this.refs.textarea
    if (!textarea || textarea.isSetup)
      return
    textarea.isSetup = true
    suggestBox(textarea, app.suggestOptions)
    textarea.addEventListener('suggestselect', this.props.onChange)
  }
  onKeyDown(e) {
    if (e.keyCode == 13 && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      e.stopPropagation()
      this.props.onSubmit()
    }
  }
  render() {
    return <textarea ref="textarea" {...this.props} onKeyDown={this.onKeyDown.bind(this)} style={{height: this.props.height, overflow: 'auto'}} />
  }
}
const ComposerTextareaVerticalFilled = verticalFilled(ComposerTextareaFixed)

export default class Composer extends React.Component {
  constructor(props) {
    super(props)

    // thread info
    let recps = []
    this.isPublic = this.props.isPublic
    this.threadRoot = null
    this.threadBranch = null
    if (this.props.thread) {
      // public thread?
      this.isPublic = isThreadPublic(this.props.thread)

      // root and branch links
      this.threadRoot = getThreadRoot(this.props.thread)
      this.threadBranch = threadlib.getLastThreadPost(this.props.thread).key

      // extract encryption recipients from thread
      if (Array.isArray(this.props.thread.value.content.recps)) {
        recps = mlib.links(this.props.thread.value.content.recps)
          .map(function (recp) { return recp.link })
          .filter(Boolean)
      }
    }

    // setup state (pulling from thread)
    this.state = {
      isPreviewing: false,
      isSending: false,
      isReply: !!this.props.thread,
      hasAddedFiles: false, // used to display a warning if a file was added in public mode, then they switch to private
      addedFileMeta: {}, // map of file hash -> metadata
      recps: recps,
      text: ''
    }
  }

  hasTopic() {
    return !!this.getTopic()
  }

  getTopic() {
    const topic = (this.props.thread) ? this.props.thread.value.content.topic : this.props.topic
    if (typeof topic === 'string')
      return topic.trim()
    return false
  }

  onChangeText(e) {
    this.setState({ text: e.target.value })
  }

  onAttach() {
    this.refs.files.click() // trigger file-selector
  }

  // called by the files selector when files are chosen
  onFilesAdded() {

    var done = multicb({ pluck: 1 })
    var filesInput = this.refs.files
    var handled=0, total = filesInput.files.length
    this.setState({ isAddingFiles: true, hasAddedFiles: true })

    let add = (f) => {
      // limit to 5mb
      if (f.size > 5 * (1024*1024)) {
        var inMB = Math.round(f.size / (1024*1024) * 100) / 100
        app.issue('Error Attaching File', new Error(f.name + ' is larger than the 5 megabyte limit (' + inMB + ' MB)'))
        this.setState({ isAddingFiles: false })
        return false
      }
      // hash file
      app.ssb.patchwork.addFileToBlobs(f.path, (err, res) => {
        if (err) {
          app.issue('Error Attaching File', error, 'This error occurred while trying to add a file to the blobstore for a new post.')
        } else {
          // insert the mention
          var str = ''
          if (!(/(^|\s)$/.test(this.state.text)))
            str += ' ' // add some space if not on a newline
          if (isImageFilename(f.name))
            str += '!' // inline the image
          str += '['+(f.name||'untitled')+']('+res.hash+')'
          this.setState({ text: this.state.text + str })

          // capture metadata
          var meta = this.state.addedFileMeta[res.hash] = {
            name: f.name || 'untitled',
            size: f.size
          }
          if (mime.contentType(f.name))
            meta.type = mime.contentType(f.name)
          if (res.width)
            meta.width = res.width
          if (res.height)
            meta.height = res.height
          this.setState({ addedFileMeta: this.state.addedFileMeta })
        }
        if (++handled >= total)
          this.setState({ isAddingFiles: false })
      })
      return true
    }

    // hash the files
    for (var i=0; i < total; i++) {
      if (!add(filesInput.files[i]))
        return false
    }
    filesInput.value = '' // clear file list
  }

  onAddRecp(id) {
    let recps = this.state.recps

    // enforce limit
    if (recps.length >= RECP_LIMIT)
      return

    // remove if already exists (we'll push to end of list so user sees its there)
    var i = recps.indexOf(id)
    if (i !== -1)
      recps.splice(i, 1)
    recps.push(id)
    this.setState({ recps: recps })
  }

  onRemoveRecp(id) {
    let recps = this.state.recps
    var i = recps.indexOf(id)
    if (i !== -1) {
      recps.splice(i, 1)
      this.setState({ recps: recps })
    }
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
        if (err.conflict)
          app.issue('Error While Publishing', 'You follow multiple people with the name "'+err.name+'." Resolve this before publishing.')
        else
          app.issue('Error While Publishing', err, 'This error occured while trying to extract the mentions from a new post.')
        return
      }

      // add file meta to mentions
      if (mentions && mentions.length) {
        mentions.forEach(mention => {
          var meta = this.state.addedFileMeta[mention.link]
          if (meta) {
            for (var k in meta) {
              if (k != 'link')
                mention[k] = meta[k]
            }
          }
        })
      }

      let recps = null, recpLinks = null
      if (!this.isPublic) {
        // setup recipients
        recps = this.state.recps

        // make sure the user is in the recipients
        if (recps.indexOf(app.user.id) === -1)
          recps.push(app.user.id)

        // setup links
        recpLinks = recps.map((id) => {
          let name = u.getName(id)
          return (name) ? { link: id, name: name } : id
        })
      }

      // publish
      var post = schemas.post(text, this.threadRoot, this.threadBranch, mentions, recpLinks)
      if (this.hasTopic())
        post.topic = this.getTopic()
      let published = (err, msg) => {
        this.setState({ isSending: false })
        if (err) app.issue('Error While Publishing', err, 'This error occurred while trying to publish a new post.')
        else {
          // reset form
          this.setState({ text: '', isPreviewing: false })

          // mark read (include the thread root because the api will automatically mark the root unread on new reply)
          app.ssb.patchwork.markRead((this.threadRoot) ? [this.threadRoot, msg.key] : msg.key)

          // call handler
          if (this.props.onSend)
            this.props.onSend(msg)
        }
      }
      if (recps)
        app.ssb.private.publish(post, recps, published)
      else
        app.ssb.publish(post, published)
    })
  }

  render() {
    const topic = this.getTopic()
    console.log('topic is', topic, this.props.thread)
    const setPreviewing = b => () => this.setState({ isPreviewing: b })
    const ComposerTextarea = (this.props.verticalFilled) ? ComposerTextareaVerticalFilled : ComposerTextareaFixed
    const Preview = (props) => {
      return <div>
        <div className="card" style={{padding: '20px', margin: '40px 10px 30px 0'}}><MarkdownBlock md={this.state.text} /></div>
      </div>
    }
    const sendIcon = (this.isPublic) ? 'users' : 'lock'
    return <div className="composer">
      <input ref="files" type="file" multiple onChange={this.onFilesAdded.bind(this)} style={{display: 'none'}} />
      <Modal Content={Preview} isOpen={this.state.isPreviewing} onClose={setPreviewing(false)} />
      { topic ? 
        <div className="composer-topic"><i className="fa fa-commenting-o" /> {topic}</div>
        : '' }
      <ComposerRecps isPublic={this.isPublic} isReadOnly={this.state.isReply} recps={this.state.recps} onAdd={this.onAddRecp.bind(this)} onRemove={this.onRemoveRecp.bind(this)} />
      <div className="composer-content">
        <ComposerTextarea ref="textarea" value={this.state.text} onChange={this.onChangeText.bind(this)} onSubmit={this.onSend.bind(this)} placeholder={!this.state.isReply ? this.props.placeholder : 'Write a reply'} />
      </div>
      <div className="composer-ctrls flex">
        <div className="flex-fill">
          { !this.isPublic ?
            (this.state.hasAddedFiles ? <em>Warning: attachments don{'\''}t work yet in private messages. Sorry!</em> : '') :
            (this.state.isAddingFiles ?
              <em>Adding...</em> :
              <a className="btn" onClick={this.onAttach.bind(this)}><i className="fa fa-paperclip" /> Add an attachment</a>) }
        </div>
        <div>
          <a className="btn" onClick={setPreviewing(true)}>Preview</a>
        </div>
        <div>
          { (!this.canSend() || this.state.isSending) ?
            <a className="btn disabled">Send</a> :
            <a className="btn highlighted" onClick={this.onSend.bind(this)}><i className={`fa fa-${sendIcon}`}/> Send</a> }
        </div>
      </div>
    </div>
  }
}

function isThreadPublic (thread) {
  if ('plaintext' in thread)
    return thread.plaintext
  return (typeof thread.value.content !== 'string')
}

function isImageFilename (name) {
  var ct = mime.contentType(name)
  return (typeof ct == 'string' && ct.indexOf('image/') === 0)
}

function getThreadRoot (msg) {
  var root = msg && msg.value && msg.value.content && msg.value.content.root
  if (root && mlib.link(root, 'msg'))
    return mlib.link(root, 'msg').link
  return msg.key
}