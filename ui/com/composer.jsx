'use babel'
import React from 'react'
import suggestBox from 'suggest-box'
import schemas from 'ssb-msg-schemas'
import mlib from 'ssb-msgs'
import threadlib from 'patchwork-threads'
import mime from 'mime-types'
import Tabs from './tabs'
import TokensInput from './tokens-input'
import { Block as MarkdownBlock } from './markdown'
import { verticalFilled } from './index'
import u from '../lib/util'
import app from '../lib/app'
import mentionslib from '../lib/mentions'
import social from '../lib/social-graph'

const MarkdownBlockVerticalFilled = verticalFilled(MarkdownBlock)
const RECP_LIMIT = 7
const TOOLBAR_TABS = [
  { label: <span><i className="fa fa-group" /> All</span>, className: 'tab-composer-all', icon: 'group' },
  { label: <span><i className="fa fa-commenting-o" /> Topic</span>, className: 'tab-composer-topic', icon: 'commenting-o' },
  { label: <span><i className="fa fa-lock" /> Mail</span>, className: 'tab-composer-mail', icon: 'lock' }
]
const TOOLBAR_TAB_ALL  = TOOLBAR_TABS[0]
const TOOLBAR_TAB_TOPIC  = TOOLBAR_TABS[1]
const TOOLBAR_TAB_MAIL = TOOLBAR_TABS[2]

class ComposerToolbar extends React.Component {
  render() {    
    return <div className="toolbar">
      <Tabs options={TOOLBAR_TABS} fill selected={this.props.currentTab} onSelect={this.props.onSelect} />
    </div>
  }
}

class ComposerTopic extends React.Component {
  componentDidMount() {
    // setup the suggest-box
    let input = this.refs && this.refs.input
    if (!input || input.isSetup)
      return
    input.isSetup = true

    function getSuggestMatch (word, cb) {
      let options = []
      app.topics.forEach(t => {
        if (t.topic.indexOf(word) === 0) {
          options.push({
            title: t.topic,
            value: t.topic
          })
        }
      })
      cb(null, options)
    }
    suggestBox(input, { any: getSuggestMatch })
    input.addEventListener('suggestselect', this.props.onChange)
  }
  render() {    
    return <div className="topic">
      <span>Topic:</span><input ref="input" onChange={this.props.onChange} value={this.props.value} placeholder="Choose a community (required)" />
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

export default class Composer extends React.Component {
  constructor(props) {
    super(props)

    // thread info
    this.threadRoot = null
    this.threadBranch = null
    if (this.props.thread) {
      // root and branch links
      this.threadRoot = this.props.thread.key
      this.threadBranch = threadlib.getLastThreadPost(this.props.thread).key
    }

    // setup state (pulling from thread)
    this.state = this.buildFreshState()

    // convenient event helpers
    this.toolbarHandlers = {
      onSelect: (tab)  => {
        // update state
        const isPublic = (tab !== TOOLBAR_TAB_MAIL)
        const isTopic = (tab === TOOLBAR_TAB_TOPIC)
        this.setState({ currentTab: tab, isTopic: isTopic, isPublic: isPublic }, () => {
          // trigger size recalc
          try { this.refs.textarea.calcHeight() }
          catch (e) { console.log(e) }
        })
      }
    }
  }

  buildFreshState() {
    let recps = []
    let topic = ''
    if (this.props.thread) {
      topic = this.props.thread.value.content.topic || ''

      // extract encryption recipients from thread
      if (Array.isArray(this.props.thread.value.content.recps)) {
        recps = mlib.links(this.props.thread.value.content.recps)
          .map(function (recp) { return recp.link })
          .filter(Boolean)
      }
    }
    return {
      currentTab: this.props.thread ? TOOLBAR_TAB_MAIL : TOOLBAR_TAB_ALL,
      isPublic: this.props.thread ? isThreadPublic(this.props.thread) : true,
      isTopic: !!topic,
      isPreviewing: false,
      isSending: false,
      isReply: !!this.props.thread,
      hasAddedFiles: false, // used to display a warning if a file was added in public mode, then they switch to private
      recps: recps,
      text: '',
      topic: topic
    }
  }

  onChangeText(e) {
    this.setState({ text: e.target.value })
  }

  onChangeTopic(e) {
    this.setState({ topic: e.target.value })
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

  onAddRecp(entry) {
    const id = entry.id
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

  onRemoveRecp(token) {
    const id = token.value
    let recps = this.state.recps
    var i = recps.indexOf(id)
    if (i !== -1) {
      recps.splice(i, 1)
      this.setState({ recps: recps })
    }
  }

  canSend() {
    return !!this.state.text.trim() && (!this.state.isTopic || !!this.state.topic.trim())
  }

  onSend() {
    var text = this.state.text
    var topic = this.state.topic
    if (!text.trim())
      return
    if (this.state.isTopic && !topic.trim())
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
      var post = schemas.post(text, this.threadRoot, this.threadBranch, mentions, recpLinks, topic||undefined)
      let published = (err, msg) => {
        this.setState({ isSending: false })
        if (err) app.issue('Error While Publishing', err, 'This error occurred while trying to publish a new post.')
        else {
          // reset form
          this.setState(this.buildFreshState())

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
    const recpTokens = this.state.recps.map(r => ({ value: r, label: u.getName(r) }))
    const ComposerTextarea = (this.props.verticalFilled) ? ComposerTextareaVerticalFilled : ComposerTextareaFixed
    const ComposerPreview  = (this.props.verticalFilled) ? MarkdownBlockVerticalFilled : MarkdownBlock
    return <div className="composer">
      <input ref="files" type="file" multiple onChange={this.onFilesAdded.bind(this)} style={{display: 'none'}} />
      <ComposerToolbar currentTab={this.state.currentTab} isReadOnly={this.state.isReply} {...this.toolbarHandlers} />
      { this.state.currentTab === TOOLBAR_TAB_TOPIC ?
        <ComposerTopic value={this.state.topic} onChange={this.onChangeTopic.bind(this)} />
        : '' }
      { this.state.currentTab === TOOLBAR_TAB_MAIL ?
        <TokensInput
          className="composer-recps"
          label="To:"
          placeholder="Add a recipient"
          tokens={recpTokens}
          suggestOptions={app.suggestOptions['@']}
          onAdd={this.onAddRecp.bind(this)}
          onRemove={this.onRemoveRecp.bind(this)}
          isReadOnly={this.state.isReply} 
          maxTokens={RECP_LIMIT}
          limitErrorMsg={`Recipient limit (${RECP_LIMIT}) reached`} />
        : '' }
      <div className="composer-content">
        { this.state.isPreviewing ?
          <ComposerPreview md={this.state.text} /> :
          <ComposerTextarea ref="textarea" value={this.state.text} onChange={this.onChangeText.bind(this)} onSubmit={this.onSend.bind(this)} placeholder={!this.state.isReply ? `Write a message` : `Write a reply`} /> }
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
          <a className="btn" onClick={()=>this.setState({ isPreviewing: !this.state.isPreviewing })}>
            { this.state.isPreviewing ? 'Edit' : 'Preview' }
          </a>
        </div>
        <div>
          { (!this.canSend() || this.state.isSending) ?
            <a className="btn disabled">Send</a> :
            <a className="btn highlighted" onClick={this.onSend.bind(this)}><i className={ 'fa fa-'+this.state.currentTab.icon }/> Send</a> }
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