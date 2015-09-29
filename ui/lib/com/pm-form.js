'use strict'
var h = require('hyperscript')
var suggestBox = require('suggest-box')
var schemas = require('ssb-msg-schemas')
var refs = require('ssb-ref')
var createHash = require('multiblob/util').createHash
var pull = require('pull-stream')
var pushable = require('pull-pushable')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var com = require('./index')
var util = require('../util')
var markdown = require('../markdown')
var mentionslib = require('../mentions')
var social = require('../social-graph')

module.exports = function (opts, h2) {
  h = h2 || h

  var recipients = []
  var placeholder = (opts && opts.placeholder) ? opts.placeholder : ''

  // make sure there are no name conflicts first
  var conflicts = []
  for (var k in app.actionItems) {
    var item = app.actionItems[k]
    if (item.type == 'name-conflict') {
      conflicts.push(h('.note.warning', 
        h('h3', 'Heads up!'),
        h('p', 'You are following more than one user named "'+item.name+'." You need to rename one of them before you send secret messages, to avoid confusion.'),
        h('ul.list-inline', item.ids.map(function (id) { return h('li', com.userImg(id), ' ', com.user(id)) }))
      ))
    }
  }
  if (conflicts.length)
    return h('.notifications', { style: 'margin-top: 24px' }, conflicts)

  // markup

  var recpInput = h('input', { onsuggestselect: onSelectRecipient, onkeydown: onRecpInputKeydown })
  var recipientsEl = h('.pm-form-recipients', h('span.recp-label', 'To'), recpInput)
  var textarea = h('textarea', { name: 'text', placeholder: placeholder, onkeyup: onTextChange })
  var postBtn = h('button.postbtn.btn', { disabled: true }, 'Send')
  suggestBox(textarea, app.suggestOptions)
  suggestBox(recpInput, { any: app.suggestOptions['@'] }, { cls: 'msg-recipients' })
  renderRecpList()

  if (opts && opts.recipients)
    opts.recipients.forEach(addRecp)

  var form = h('form.pm-form', { onsubmit: post },
    recipientsEl,
    h('.pm-form-textarea', textarea),
    h('.pm-form-attachments', postBtn)
  )

  function disable () {
    postBtn.setAttribute('disabled', true)
  }

  function enable () {
    postBtn.removeAttribute('disabled')
  }

  function renderRecpList () {
    // remove all .recp
    Array.prototype.forEach.call(recipientsEl.querySelectorAll('.recp'), function (el) {
      recipientsEl.removeChild(el)
    })

    // render
    recipients.forEach(function (id) {
      recipientsEl.insertBefore(h('.recp',
        com.icon('lock'),
        ' ',
        com.userName(id),
        ' ',
        h('a', { href: '#', onclick: onRemoveRecipient, 'data-id': id, innerHTML: '&times;', tabIndex: '-1' })
      ), recpInput)
    })

    resizeTextarea()
  }

  // handlers

  function onTextChange (e) {
    if (recipients.length && textarea.value.trim())
      enable()
    else
      disable()
  }

  function addRecp (id) {
    // enforce limit
    if (recipients.length >= 7)  {
      ui.notice('warning', 'Cannot add @'+com.userName(id)+' - You have reached the limit of 7 recipients on a Secret Message.')
      recpInput.value = ''
      return
    }

    // warn if the recipient doesnt follow the current user
    if (id !== app.user.id && !social.follows(id, app.user.id))
      ui.notice('warning', 'Warning: @'+com.userName(id)+' does not follow you, and may not receive your message.')

    // remove if already exists (we'll push to end of list so user sees its there)
    var i = recipients.indexOf(id)
    if (i !== -1)
      recipients.splice(i, 1)

    // add, render
    recipients.push(id)
    recpInput.value = ''
    renderRecpList()
  }

  function onSelectRecipient (e) {
    addRecp(e.detail.id)
  }

  function onRemoveRecipient (e) {
    e.preventDefault()
    var i = recipients.indexOf(e.target.dataset.id)
    if (i !== -1) {
      recipients.splice(i, 1)
      renderRecpList()
      recpInput.focus()
    }
  }

  function onRecpInputKeydown (e) {
    // backspace on an empty field?
    if (e.keyCode == 8 && recpInput.value == '' && recipients.length) {
      recipients.pop()
      renderRecpList()
    }
  }

  // dynamically sizes the textarea based on available space
  // (no css method, including flexbox, would really nail this one)
  function resizeTextarea () {
    try {
      var height = 400 - 4
      height -= recipientsEl.getClientRects()[0].height
      height -= form.querySelector('.pm-form-attachments').getClientRects()[0].height
      textarea.style.height = height + 'px'
    } catch (e) {
      // ignore, probably havent rendered yet
    }
  }

  function post (e) {
    e.preventDefault()

    var text = textarea.value
    if (!text.trim())
      return

    disable()
    ui.pleaseWait(true)

    // prep text
    mentionslib.extract(text, function (err, mentions) {
      if (err) {
        ui.setStatus(null)
        ui.pleaseWait(false)
        enable()
        if (err.conflict)
          modals.error('Error While Publishing', 'You follow multiple people with the name "'+err.name+'." Go to the homepage to resolve this before publishing.')
        else
          modals.error('Error While Publishing', err, 'This error occured while trying to extract the mentions from a secret message text.')
        return
      }

      // make sure the user is in the recipients
      if (recipients.indexOf(app.user.id) === -1)
        recipients.push(app.user.id)

      // list recipients with their names
      var recps = recipients.map(function (id) {
        return { link: id, name: com.userName(id) }
      })

      // publish
      var post = schemas.post(text, null, null, mentions, recps)
      app.ssb.private.publish(post, recipients, function (err, msg) {
        ui.setStatus(null)
        enable()
        ui.pleaseWait(false)
        if (err) modals.error('Error While Publishing', err, 'This error occured while trying to private-publish a new secret message.')
        else {
          app.ssb.patchwork.subscribe(msg.key)
          app.ssb.patchwork.markRead(msg.key)
          opts && opts.onpost && opts.onpost(msg)
        }
      })
    })
  }

  return form
}