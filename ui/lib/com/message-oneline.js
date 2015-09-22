'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var app = require('../app')
var com = require('./index')
var u = require('../util')

function getSummary (msg, opts) {
  var c = msg.value.content
  var maxlen = (opts && opts.menuitem) ? 40 : 100
  function t(text) {
    if (text.length > maxlen)
      return text.slice(0, maxlen-3) + '...'
    return text
  }

  try {
    var s = ({
      post: function () { 
        if (!c.text) return
        if (mlib.link(c.root, 'msg'))
          return com.a('#/msg/'+mlib.link(c.root).link + '?jumpto=' + encodeURIComponent(msg.key), t(c.text))
        return com.a('#/msg/'+msg.key, t(c.text))
      },
      mail: function () {
        return com.a('#/msg/'+msg.key, [c.subject||'(No Subject)', ' ', h('span.text-muted', t(c.body))])
      },
      vote: function () {
        if (!mlib.link(c.vote, 'msg'))
          return
        var link, desc = h('span', 'this message')
        if (c.vote == 1)
          link = h('a', { href: '#/msg/'+mlib.link(c.vote).link }, com.icon('star'), ' ', desc)
        else if (c.vote <= 0)
          link = h('a', { href: '#/msg/'+mlib.link(c.vote).link }, com.icon('erase'), ' ', desc)
        appendMsgSummary(desc, mlib.link(c.vote).link, t)
        return link
      },
      flag: function () {
        if (!mlib.link(c.flag, 'msg'))
          return
        if (c.flag)
          return com.a('#/msg/'+mlib.link(c.flag).link, h('span.text-danger', com.icon('flag'), ' Flagged your post ', h('span.label.label-danger', c.flag)))
        else
          return com.a('#/msg/'+mlib.link(c.flag).link, h('span.text-danger', com.icon('erase'), ' Unflagged your post'))
      }
    })[c.type]()
    if (!s || s.length == 0)
      s = false
  } catch (e) { }

  if (!s)
    s = h('div', t(JSON.stringify(msg.value.content)))
  return s
}

module.exports = function (msg, opts) {

  // markup

  var content
  if (typeof msg.value.content == 'string') {
    // encrypted message, try to decrypt
    content = h('div')
    app.ssb.private.unbox(msg.value.content, function (err, decrypted) {
      if (decrypted) {
        // success, render content
        msg.value.content = decrypted
        var col = content.parentNode
        var icon = com.icon('lock')
        icon.style.marginRight = '5px'
        col.removeChild(content)
        col.appendChild(icon)
        col.appendChild(getSummary(msg, opts))
      }
    })
  } else
    content = getSummary(msg, opts)
  if (!content)
    return

  var msgOneline
  if (opts && opts.menuitem) {
    // get the href for the link
    var c = msg.value.content
    var href = '#/msg/'
    if (mlib.link(c.root, 'msg'))
      href += mlib.link(c.root).link + '?jumpto=' + encodeURIComponent(msg.key)
    else if (mlib.link(c.voteTopic, 'msg'))
      href += mlib.link(c.voteTopic).link
    else
      href += msg.key

    // render based on type
    if (c.type == 'vote') {
      msgOneline = h('a.message-oneline-menuitem', { href: href },
        h('.message-oneline-column.only', h('strong', com.userName(msg.value.author)), ' ', content)
      )
    } else {
      msgOneline = h('a.message-oneline-menuitem', { href: href },
        h('.message-oneline-column', h('strong', com.userName(msg.value.author))),
        h('.message-oneline-column', content),
        h('.message-oneline-column', ago(msg))
      )
    }
  } else {
    msgOneline = h('.message-oneline',
      h('.message-oneline-column', com.userImg(msg.value.author)),
      h('.message-oneline-column', com.user(msg.value.author, { maxlength: 15 })),
      h('.message-oneline-column', content),
      h('.message-oneline-column', ago(msg))
    )
  }

  app.ssb.patchwork.isRead(msg.key, function (err, isread) {
    if (!err && !isread)
      msgOneline.classList.add('unread')
  })

  return msgOneline
}

function appendMsgSummary (el, mid, shorten) {
  app.ssb.get(mid, function (err, msg) {
    if (!msg) return
    if (msg.content.type == 'post')
      el.textContent = shorten(msg.content.text)
    else if (msg.content.type == 'mail')
      el.textContent = shorten(msg.content.subject)
  })
}

function ago (msg) {
  var str = u.prettydate(new Date(msg.value.timestamp))
  if (str == 'yesterday')
    str = '1d'
  return h('small.text-muted', str, ' ago')
}