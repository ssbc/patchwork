'use babel'
import React from 'react'
import suggestBox from 'suggest-box'
import schemas from 'ssb-msg-schemas'
import mlib from 'ssb-msgs'
import threadlib from 'patchwork-threads'
import mime from 'mime-types'
import multicb from 'multicb'
import DropdownBtn from '../dropdown'
import ComposerChannel from './channel'
import { RECP_LIMIT, ComposerRecps } from './recps'
import Modal from '../modals/popup'
import { Block as MarkdownBlock } from '../markdown'
import { verticalFilled, rainbow } from '../index'
import u from '../../lib/util'
import app from '../../lib/app'
import mentionslib from '../../lib/mentions'

const TEXTAREA_VERTICAL_FILL_ADJUST = -5 // remove 5 px to account for padding
const MarkdownBlockVerticalFilled = verticalFilled(MarkdownBlock)

class ComposerTextareaFixed extends React.Component {
  componentDidMount() {
    // setup the suggest-box
    let textarea = this.refs && this.refs.textarea
    if (!textarea || textarea.isSetup) { return }
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
    return <textarea ref="textarea" {...this.props} 
              onKeyDown={this.onKeyDown.bind(this)} 
              style={{height: this.props.height+TEXTAREA_VERTICAL_FILL_ADJUST, 
                      overflow: 'auto'}} 
           />
  }
}
const ComposerTextareaVerticalFilled = verticalFilled(ComposerTextareaFixed)

export default class Composer extends React.Component {
  constructor(props) {
    super(props)

    // thread info
    let recps = this.props.recps || []
    this.isThreadPublic = null
    this.threadChannel = null
    this.threadRoot = null
    this.threadBranch = null
    if (this.props.thread) {
      // thread categorization
      this.isThreadPublic = isThreadPublic(this.props.thread)
      this.threadChannel = (this.props.thread.value.content.channel || '').trim()

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
      isPublic: this.props.isPublic || false,
      channel: this.props.channel,
      hasAddedFiles: false, // used to display a warning if a file was added in public mode, then they switch to private
      addedFileMeta: {}, // map of file hash -> metadata
      recps: recps,
      text: ''
    }
  }

  isReply() {
    return !!this.props.thread
  }

  isPublic() {
    return (this.isReply()) ? this.isThreadPublic : this.state.isPublic
  }

  hasChannel() {
    return !!this.getChannel()
  }

  getChannel() {
    return (this.isReply()) ? this.threadChannel : this.state.channel
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
        app.issue('Error Attaching File', 
                  new Error(f.name + ' is larger than the 5 megabyte limit (' + 
                            inMB + ' MB)'))
        this.setState({ isAddingFiles: false })
        return false
      }

      // read, hash, and store
      var reader = new FileReader()
      reader.onload = function () {
        var buff64 = new Buffer(new Uint8Array(reader.result)).toString('base64')
        app.ssb.patchwork.addFileToBlobs(buff64, next)
      }
      reader.onerror = function (e) {
        console.error(e)
        next(new Error('Failed to upload '+f.name))
      }
      const next = (err, hash) => {
        if (err) {
          app.issue('Error Attaching File', 
                    err, 
                    'This error occurred while trying to add a file to the blobstore for a new post.')
        } else {
          // insert the mention
          var str = ''
          if (!(/(^|\s)$/.test(this.state.text)))
            str += ' ' // add some space if not on a newline
          if (isImageFilename(f.name))
            str += '!' // inline the image
          str += '['+(f.name||'untitled')+']('+hash+')'
          this.setState({ text: this.state.text + str })

          // capture metadata
          var meta = this.state.addedFileMeta[hash] = {
            name: f.name || 'untitled',
            size: f.size
          }
          if (f.type)
            meta.type = f.type
          else if (mime.contentType(f.name))
            meta.type = mime.contentType(f.name)
          
          this.setState({ addedFileMeta: this.state.addedFileMeta })
        }
        if (++handled >= total)
          this.setState({ isAddingFiles: false })
      }
      reader.readAsArrayBuffer(f)
      return true
    }

    // hash the files
    for (var i=0; i < total; i++) {
      if (!add(filesInput.files[i]))
        return false
    }
    filesInput.value = '' // clear file list
  }

  onSelectPublic(isPublic) {
    if (this.isReply())
      return // cant change if a reply
    this.setState({ isPublic: isPublic })
  }

  onChangeChannel(name) {
    if (this.isReply())
      return // cant change if a reply
    this.setState({ channel: name })
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

      let channel = this.getChannel()
      let recps = null, recpLinks = null
      if (!this.isPublic()) {
        // no channel on private msgs
        channel = false

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
      var post = schemas.post(text, this.threadRoot, this.threadBranch, mentions, recpLinks, channel)
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
    const vertical = this.props.verticalFilled
    const channel = this.getChannel()
    const setPreviewing = b => () => this.setState({ isPreviewing: b })
    const ComposerTextarea = (vertical) ? ComposerTextareaVerticalFilled : ComposerTextareaFixed

    const Preview = (props) => {
      return <div>
        <div className="card" style={{padding: '20px', margin: '40px 10px 30px 0'}}><MarkdownBlock md={this.state.text} /></div>
      </div>
    }

    const AudienceBtn = (props) => {
      const opts = [
        { label: <span><i className="fa fa-inbox"/> Private</span>, value: false },
        { label: <span><i className="fa fa-bullhorn"/> Public</span>, value: true }
      ]
      if (!props.canChange)
        return <a className="btn disabled">{opts[+props.isPublic].label}</a>
      return <DropdownBtn className="btn" items={opts} onSelect={props.onSelect}>{opts[+props.isPublic].label} <i className="fa fa-caret-down" /></DropdownBtn>
    }

    const AttachBtn = (props) => {
      if (!props.isPublic) {
        if (props.isReply)
          return <span/>
        return <a className="btn disabled"><i className="fa fa-paperclip" /> Attachments not available in PMs</a>
      }
      if (props.isAdding)
        return <a className="btn disabled"><i className="fa fa-paperclip" /> Adding...</a>
      return <a className="btn" onClick={props.onAttach}><i className="fa fa-paperclip" /> Add an attachment</a>
    }

    const SendBtn = (props) => {
      const sendIcon = (this.isPublic()) ? 'users' : 'lock'
      if (!props.canSend)
        return <a className="btn disabled">Send</a>
      return <a className="btn highlighted" onClick={this.onSend.bind(this)}><i className={`fa fa-${sendIcon}`}/> Send</a>
    }

    var toolbarTop, toolbarBottom
    if (vertical) {
      toolbarTop = <div>
        <div className="composer-ctrls flex">
          <AudienceBtn canChange={!this.isReply()} isPublic={this.isPublic()} onSelect={this.onSelectPublic.bind(this)} />
          <AttachBtn isPublic={this.isPublic()} isReply={this.isReply()} hasAdded={this.state.hasAddedFiles} isAdding={this.state.isAddingFiles} onAttach={this.onAttach.bind(this)} />
          <div className="flex-fill" />
          <a className="btn" onClick={setPreviewing(true)}>Preview</a>
          <SendBtn canSend={this.canSend() && !this.state.isSending} />
        </div>
        { this.isPublic()
          ? <ComposerChannel isReadOnly={this.isReply()} onChange={this.onChangeChannel.bind(this)} value={this.getChannel()} />
          : <ComposerRecps isReadOnly={this.isReply()} recps={this.state.recps} onAdd={this.onAddRecp.bind(this)} onRemove={this.onRemoveRecp.bind(this)} /> }
      </div>
    } else {
      toolbarBottom = <div>
        <div className="composer-ctrls flex" style={{ borderBottomColor: '#ccc', borderTop: 0 }}>
          <AudienceBtn canChange={!this.isReply()} isPublic={this.isPublic()} onSelect={this.onSelectPublic.bind(this)} />
          <AttachBtn isPublic={this.isPublic()} isReply={this.isReply()} hasAdded={this.state.hasAddedFiles} isAdding={this.state.isAddingFiles} onAttach={this.onAttach.bind(this)} />
          <div className="flex-fill" />
          <a className="btn" onClick={setPreviewing(true)}>Preview</a>
          <SendBtn canSend={this.canSend() && !this.state.isSending} />
        </div> 
        { !this.isReply()
          ? ( this.isPublic()
            ? <ComposerChannel isReadOnly={this.isReply()} onChange={this.onChangeChannel.bind(this)} value={this.getChannel()} />
            : <ComposerRecps isReadOnly={this.isReply()} recps={this.state.recps} onAdd={this.onAddRecp.bind(this)} onRemove={this.onRemoveRecp.bind(this)} /> )
          : '' }
      </div>
    }

    return <div className="composer">
      <input ref="files" type="file" multiple onChange={this.onFilesAdded.bind(this)} style={{display: 'none'}} />
      <Modal Content={Preview} isOpen={this.state.isPreviewing} onClose={setPreviewing(false)} />
      { toolbarTop }
      <div className="composer-content">
        <ComposerTextarea ref="textarea" value={this.state.text} onChange={this.onChangeText.bind(this)} onSubmit={this.onSend.bind(this)} placeholder={this.isReply() ? 'Write a reply' : (this.props.placeholder||'Write your message here')} />
      </div>
      { toolbarBottom }
    </div>
  }
}

function isThreadPublic (thread) {
  if ('plaintext' in thread) { return thread.plaintext }
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
