'use strict'
var h = require('hyperscript')
var suggestBox = require('suggest-box')
var schemas = require('ssb-msg-schemas')
var mlib = require('ssb-msgs')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var com = require('./index')
var markdown = require('../markdown')
var mentionslib = require('../mentions')
var social = require('../social-graph')

module.exports = function (rootMsg, branchMsg, opts) {

  var isSecret = (rootMsg && rootMsg.plaintext === false)
  var namesList = {} // a name->id map for the previews
  for (var id in app.users.names)
    if (id == app.user.id || social.follows(app.user.id, id))
      namesList[app.users.names[id]] = id
  var placeholder = (opts && opts.placeholder) ?
    opts.placeholder : 
    (!rootMsg ? 'Share a message with the world...' : 'Reply...')

  // markup

  var previewEl = h('.post-form-preview')
  var filesInput = h('input.hidden', { type: 'file', multiple: true, onchange: filesAdded })  
  var textarea = h('textarea.short', {
    name: 'text',
    placeholder: placeholder,
    value: (opts && opts.initval) ? opts.initval : '',
    rows: ((opts && opts.rows) ? opts.rows : 1),
    onkeyup: onPostTextChange
  })
  var postBtn = h('button.postbtn.btn', 'Publish')
  suggestBox(textarea, app.suggestOptions)

  var form = h('form.post-form' + ((!!rootMsg) ? '.reply-form' : ''), { onsubmit: post },
    (!opts || !opts.noheader) ? h('small.text-muted', 'Public post. Markdown, @-mentions, and emojis are supported. ', h('a', { href: '#', onclick: cancel }, 'Cancel')) : '',
    h('.post-form-textarea', textarea),
    previewEl,
    h('.post-form-attachments.hidden',
      postBtn,
      (!isSecret) ? h('a', { href: '#', onclick: addFile }, 'Click here to add an attachment') : '',
      filesInput
    )
  )

  function disable () {
    form.querySelector('.post-form-attachments').classList.add('hidden')
    textarea.setAttribute('rows', 1)
    textarea.classList.add('short')
  }

  function enable () {
    form.querySelector('.post-form-attachments').classList.remove('hidden')
    textarea.setAttribute('rows', 4)
    textarea.classList.remove('short')
  }

  // handlers

  function onPostTextChange () {
    previewEl.innerHTML = (!!textarea.value) ? markdown.block(textarea.value, namesList) : ''
    if (textarea.value.trim())
      enable()
    else
      disable()
  }

  function post (e) {
    e.preventDefault()

    var text = textarea.value
    if (!text.trim())
      return

    disable()
    ui.pleaseWait(true)

    // abort if the rootMsg wasnt decryptable
    if (rootMsg && typeof rootMsg.value.content == 'string') {
      ui.pleaseWait(false)
      ui.notice('danger', 'Unable to decrypt rootMsg message')
      enable()
      return 
    }

    // prep text
    mentionslib.extract(text, function (err, mentions) {
      if (err) {
        ui.setStatus(null)
        ui.pleaseWait(false)
        enable()
        if (err.conflict)
          modals.error('Error While Publishing', 'You follow multiple people with the name "'+err.name+'." Go to the homepage to resolve this before publishing.')
        else
          modals.error('Error While Publishing', err, 'This error occured while trying to extract the mentions from a new post.')
        return
      }

      // get encryption recipients from rootMsg
      var recps
      try {
        if (Array.isArray(rootMsg.value.content.recps)) {
          recps = mlib.links(rootMsg.value.content.recps)
            .map(function (recp) { return recp.link })
            .filter(Boolean)
        }
      } catch (e) {}

      // post
      var post = schemas.post(text, rootMsg && rootMsg.key, branchMsg && branchMsg.key, mentions, recps)
      if (recps)
        app.ssb.private.publish(post, recps, published)
      else
        app.ssb.publish(post, published)

      function published (err, msg) {
        ui.setStatus(null)
        enable()
        ui.pleaseWait(false)
        if (err) modals.error('Error While Publishing', err, 'This error occurred while trying to publish a new post.')
        else {
          textarea.value = ''
          onPostTextChange()
          app.ssb.patchwork.subscribe(msg.key)
          app.ssb.patchwork.markRead(msg.key)
          opts && opts.onpost && opts.onpost(msg)
        }
      }
    })
  }

  function cancel (e) {
    e.preventDefault()

    if (textarea.value && !confirm('Are you sure you want to cancel? Your message will be lost.'))
      return

    form.parentNode.removeChild(form)
    opts && opts.oncancel && opts.oncancel()
  }

  function addFile (e) {
    e.preventDefault()
    filesInput.click() // trigger file-selector
  }

  function filesAdded (e) {
    // hash the files
    var n = filesInput.files.length
    ui.setStatus('Hashing ('+n+' files left)...')
    for (var i=0; i < n; i++) {
      if (!add(filesInput.files[i])) {
        ui.setStatus(false)
        return 
      }
    }

    function add (f) {
      if (f.size > 5 * (1024*1024)) {
        var inMB = Math.round(f.size / (1024*1024) * 100) / 100
        modals.error('Error Attaching File', f.name + ' is larger than the 5 megabyte limit (' + inMB + ' MB)')
        return false
      }
      app.ssb.patchwork.addFileToBlobs(f.path, function (err, res) {
        if (err) {
          modals.error('Error Attaching File', error, 'This error occurred while trying to add a file to the blobstore for a new post.')
        } else {
          if (!(/(^|\s)$/.test(textarea.value)))
            textarea.value += ' '
          textarea.value += '['+(f.name||'untitled')+']('+res.hash+')'
          onPostTextChange()
          if (--n === 0)
            ui.setStatus(false)
        }
      })
      return true
    }
  }

  return form
}
