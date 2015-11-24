'use babel'
import React from 'react'
import suggestBox from 'suggest-box'
import schemas from 'ssb-msg-schemas'
import mlib from 'ssb-msgs'
import threadlib from 'patchwork-threads'
import mime from 'mime-types'
import Tabs from './tabs'
import { verticalFilled } from './index'
import u from '../lib/util'
import app from '../lib/app'
import mentionslib from '../lib/mentions'
import social from '../lib/social-graph'

const RECP_LIMIT = 7

const TOOLBAR_TABS = [
  { label: <span><i className="fa fa-group" /> Public</span> },
  { label: <span><i className="fa fa-lock" /> Private</span> }
]
const TOOLBAR_TAB_PUBLIC  = TOOLBAR_TABS[0]
const TOOLBAR_TAB_PRIVATE = TOOLBAR_TABS[1]

class ComposerToolbar extends React.Component {
  render() {    
    return <div className="toolbar">
      <Tabs options={TOOLBAR_TABS} selected={this.props.isPublic ? TOOLBAR_TAB_PUBLIC : TOOLBAR_TAB_PRIVATE} onSelect={this.props.onSelect} />
    </div>
  }
}

class ComposerRecp extends React.Component {
  render() {
    return <span className="recp">
      {u.getName(this.props.id)}
      {this.props.isReadOnly ? '' : <a onClick={() => this.props.onRemove(this.props.id)}><i className="fa fa-remove"/></a>}
    </span>
  }
}

class ComposerRecps extends React.Component {
  constructor(props) {
    super(props)
    this.state = { inputText: '' }
  }

  componentDidMount() {
    this.setupSuggest()
  }
  componentDidUpdate() {
    this.setupSuggest()
  }
  setupSuggest() {
    // setup the suggest-box
    const input = this.refs && this.refs.input
    if (!input || input.isSetup)
      return
    input.isSetup = true
    suggestBox(input, { any: app.suggestOptions['@'] }, { cls: 'msg-recipients' })
    input.addEventListener('suggestselect', this.onSuggestSelect.bind(this))
  }

  onChange(e) {
    this.setState({ inputText: e.target.value })
  }

  onSuggestSelect(e) {
    this.props.onAdd(e.detail.id)
    this.setState({ inputText: '' })
  }

  render() {
    if (this.props.isPublic)
      return <div/>
    let isAtLimit = (this.props.recps.length >= RECP_LIMIT)
    let warnings = this.props.recps.filter((id) => (id !== app.user.id) && !social.follows(id, app.user.id))
    return <div className="composer-recps">
      <div>
        To: {this.props.recps.map((r) => <ComposerRecp key={r} id={r} onRemove={this.props.onRemove} isReadOnly={this.props.isReadOnly} />)}
        { (!isAtLimit && !this.props.isReadOnly) ?
          <input ref="input" type="text" placeholder="Add a recipient" value={this.state.inputText} onChange={this.onChange.bind(this)} {...this.props} /> :
          '' }
      </div>
      { isAtLimit ? <div className="warning">Recipient limit reached</div> : '' }
      { warnings.length ?
        <div>{warnings.map(id => <div key={id} className="warning">Warning: @{u.getName(id)} does not follow you, and may not receive your message.</div>)}</div> :
        '' }
    </div>
  }
}

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

class ComposerDrafts extends React.Component {
  render() {
    if (!this.props.drafts.length)
      return <span/>
    return <div className="composer-drafts">
      { this.props.drafts.map((draft, i) => {
        const current = draft === this.props.currentDraft
        return <div key={'draft'+i} className={current?'selected':''}>
          <div onClick={()=>this.props.onOpenDraft(draft)}>{draft.text}</div>
          { current ?
            <div><i className="fa fa-pencil" /></div> :
            <div className="delete" onClick={()=>this.props.onDeleteDraft(draft)}><i className="fa fa-times" /></div> }
        </div>
      }) }
    </div>
  }
}

export default class Composer extends React.Component {
  constructor(props) {
    super(props)

    // load drafts, if not writing a reply
    var drafts
    if (!this.props.thread) {
      try { drafts = JSON.parse(localStorage.drafts) }
      catch (e) {}
    }

    // thread info
    let recps = []
    this.threadRoot = null
    this.threadBranch = null
    if (this.props.thread) {
      // root and branch links
      this.threadRoot = this.props.thread.key
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
      isPublic: this.props.thread ? isThreadPublic(this.props.thread) : true,
      isSending: false,
      isReply: !!this.props.thread,
      hasAddedFiles: false, // used to display a warning if a file was added in public mode, then they switch to private
      recps: recps,
      currentDraft: null, // only used if !isReply
      drafts: drafts || [], // only used if !isReply
      text: ''
    }

    // convenient event helpers
    this.toolbarHandlers = {
      onSelect: (v)  => {
        // update state
        const isPublic = (v == TOOLBAR_TAB_PUBLIC)
        this.updateDraft({ isPublic: isPublic })
        this.setState({ isPublic: isPublic }, () => {
          // trigger size recalc
          try { this.refs.textarea.calcHeight() }
          catch (e) { console.log(e) }
        })
      }
    }
  }

  onChangeText(e) {
    this.setState({ text: e.target.value })
    this.updateDraft({ text: e.target.value })
  }

  onAttach() {
    this.refs.files.click() // trigger file-selector
  }

  // called by the files selector when files are chosen
  onFilesAdded() {

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
          var str = ''
          if (!(/(^|\s)$/.test(this.state.text)))
            str += ' ' // add some space if not on a newline
          if (isImageFilename(f.name))
            str += '!' // inline the image
          str += '['+(f.name||'untitled')+']('+res.hash+')'
          this.setState({ text: this.state.text + str })
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
    this.updateDraft({ recps: recps })
  }

  onRemoveRecp(id) {
    let recps = this.state.recps
    var i = recps.indexOf(id)
    if (i !== -1) {
      recps.splice(i, 1)
      this.setState({ recps: recps })
      this.updateDraft({ recps: recps })
    }
  }

  onOpenDraft(draft) {
    this.setState({ currentDraft: draft, text: draft.text, recps: draft.recps, isPublic: draft.isPublic })
  }

  onDeleteDraft(draft) {
    // remove draft
    const drafts = this.state.drafts.filter(d => d !== draft)
    this.setState({ drafts: drafts })
    // save
    localStorage.drafts = JSON.stringify(drafts)
  }

  updateDraft(values) {
    // dont use drafts in replies (atm)
    if (this.state.isReply)
      return

    // get/create draft
    let draft = this.state.currentDraft
    if (!draft) {
      draft = { text: this.state.text, recps: this.state.recps, isPublic: this.state.isPublic }
      this.state.drafts.unshift(draft)
      this.setState({
        currentDraft: this.state.currentDraft || draft,
        drafts: this.state.drafts
      })
    }

    // update values
    for (var k in values)
      draft[k] = values[k]

    // save
    localStorage.drafts = JSON.stringify(this.state.drafts)
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

      let recps = null, recpLinks = null
      if (!this.state.isPublic) {
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
      let published = (err, msg) => {
        this.setState({ isSending: false })
        if (err) app.issue('Error While Publishing', err, 'This error occurred while trying to publish a new post.')
        else {
          // remove draft and reset form
          this.setState({ text: '' })
          if (this.state.currentDraft)
            this.onDeleteDraft(this.state.currentDraft)

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
    let msgType = this.state.isPublic ? 'public' : 'private'
    const ComposerTextarea = (this.props.verticalFilled) ? ComposerTextareaVerticalFilled : ComposerTextareaFixed
    return <div className="composer">
      <input ref="files" type="file" multiple onChange={this.onFilesAdded.bind(this)} style={{display: 'none'}} />
      <ComposerToolbar isPublic={this.state.isPublic} isReadOnly={this.state.isReply} {...this.toolbarHandlers} />
      <ComposerRecps isPublic={this.state.isPublic} isReadOnly={this.state.isReply} recps={this.state.recps} onAdd={this.onAddRecp.bind(this)} onRemove={this.onRemoveRecp.bind(this)} />
      <div className="composer-content">
        <ComposerTextarea ref="textarea" value={this.state.text} onChange={this.onChangeText.bind(this)} onSubmit={this.onSend.bind(this)} placeholder={!this.state.isReply ? `Write a message` : `Write a reply`} />
      </div>
      <div className="composer-ctrls flex">
        <div className="flex-fill">
          { !this.state.isPublic ?
            (this.state.hasAddedFiles ? <em>Warning: attachments don{'\''}t work yet in private messages. Sorry!</em> : '') :
            (this.state.isAddingFiles ?
              <em>Adding...</em> :
              <a className="btn" onClick={this.onAttach.bind(this)}><i className="fa fa-paperclip" /> Add an attachment</a>) }
        </div>
        <div>
          { (!this.canSend() || this.state.isSending) ?
            <a className="btn disabled">Send</a> :
            <a className="btn highlighted" onClick={this.onSend.bind(this)}><i className={ this.state.isPublic ? "fa fa-users" : "fa fa-lock" }/> Send</a> }
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