'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var paramap  = require('pull-paramap')
var mlib = require('ssb-msgs')
var schemas = require('ssb-msg-schemas')
var ssbref = require('ssb-ref')
var pauser = require('pause-offscreen')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var com = require('./index')
var u = require('../util')
var markdown = require('../markdown')
var social = require('../social-graph')

module.exports = function (msg, opts) {

  // markup

  msg.plaintext = (typeof msg.value.content !== 'string')
  var msgComments = h('.message-comments')
  var msgEl = h('.message'+(!msg.plaintext?'.secret':'')+((opts && opts.fullview)?'.fullview':'.smallview'),
    { onclick: (!(opts && opts.fullview) ? onopen(msg) : null) },
    com.userImg(msg.value.author),
    h('.message-inner',
      h('ul.message-header.list-inline',
        h('li', com.user(msg.value.author)),
        !msg.plaintext ? h('li', com.icon('lock')) : '',
        h('li.pull-right', h('a', { href: '#', onclick: onflag(msg), title: 'Flag this post' }, com.icon('flag'))),
        h('li.favorite.pull-right',
          h('span.users'),
          h('a', { href: '#', onclick: onfavorite(msg), title: 'Favorite this post' }, com.icon('star'))
        )
      ),
      h('.message-body', fetchAndRenderReplyLink(msg), (typeof msg.value.content != 'string') ? com.messageContent(msg) : ''),
      h('ul.message-footer.list-inline',
        (!(opts && opts.fullview)) ?
          h('li', com.a('#/msg/'+msg.key, h('small.comment-count-digits'))) :
          '',
        h('li.pull-right', h('small', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true))))
      )
    ),
    msgComments
  )
  msg.el = msgEl // attach el to msg for the handler-funcs to access
  fetchState(msg, opts)

  // unread
  app.ssb.patchwork.isRead(msg.key, function (err, isread) {
    if (!err && !isread)
      msg.el.classList.add('unread')
  })

  // if encrypted, attempt to decrypt
  if (!msg.plaintext) {
    app.ssb.private.unbox(msg.value.content, function (err, decrypted) {
      if (decrypted) {
        msg.value.content = decrypted

        // render content
        var body = msgEl.querySelector('.message-body')
        body.innerHTML = ''
        body.appendChild(com.messageContent(msg))
      }
    })
  }

  if (opts && opts.live) {
    // create a live-stream of the log
    var livelog = app.ssb.createLogStream({ gt: Date.now(), live: true })
    ui.onTeardown(function() { livelog(true, function(){}) })
    pull(livelog, pull.drain(function (newmsg) {
      if (newmsg.sync) return

      // decrypt, if needed
      newmsg.plaintext = (typeof newmsg.value.content !== 'string')
      if (!newmsg.plaintext) {
        app.ssb.private.unbox(newmsg.value.content, function (err, decrypted) {
          if (decrypted) {
            newmsg.value.content = decrypted
            next()
          }
        })
      } else next()

      function next () {
        var c = newmsg.value.content
        // only messages in this thread
        if (!(c.type && c.root && mlib.link(c.root).link == msg.key))
          return

        // render new comments automatically
        var el = renderComment(newmsg)
        el.classList.add('add-anim')
        setTimeout(function() {
          el.querySelector('.message-inner').style.background = '#fff'
        }, 33)
        msg.el.querySelector('.message-comments').appendChild(el)
      }
    }))

    // render a notice that this is live
    msg.el.appendChild(h('.well.text-muted', { style: 'margin: 5px 0 0 88px' }, com.icon('flash'), ' Replies will auto-update in realtime.'))
  }

  // add offscreen pausing
  var unlistenPauser = pauser(msgEl)
  ui.onTeardown(unlistenPauser)

  return msgEl
}

function onpostreply (msg, opts) {
  return function (comment) {
    if (opts && opts.fullview)
      return
    if (typeof comment.value.content == 'string') // an encrypted message?
      ui.refreshPage() // easier just to refresh to page, for now
    else
      msg.el.querySelector('.message-comments').appendChild(renderComment(comment))
  }
}

function onopen (msg) {
  return function (e) {
    // make sure this isnt a click on a link
    var node = e.target
    while (node && node !== msg.el) {
      if (node.tagName == 'A')
        return
      node = node.parentNode
    }

    e.preventDefault()
    e.stopPropagation()

    var root = mlib.link(msg.value.content.root || msg.value.content.flag)
    var key = root ? root.link : msg.key
    window.location.hash = '#/msg/'+key+((key!=msg.key)?('?jumpto='+encodeURIComponent(msg.key)):'')
  }
}

function onfavorite (msg) {
  var voting = false
  return function (e) {
    e.preventDefault()
    e.stopPropagation()

    if (voting)
      return // wait please
    voting = true
    var favoriteBtn = this

    // get current state by checking if the control is selected
    // this won't always be the most recent info, but it will be close and harmless to get wrong,
    // plus it will reflect what the user expects to happen happening
    var wasSelected = favoriteBtn.classList.contains('selected')
    var newvote = (wasSelected) ? 0 : 1
    updateFavBtn(favoriteBtn, !wasSelected)
    app.ssb.publish(schemas.vote(msg.key, newvote), function (err) {
      voting = false
      if (err) {
        updateFavBtn(favoriteBtn, wasSelected) // undo
        modals.error('Error While Publishing', err, 'This error occured while trying to fav/unfav message.')
      } else {
        // update ui
        var users = msg.el.querySelector('.message-header .favorite .users')
        if (newvote === 0) {
          try { users.removeChild(users.querySelector('.this-user')) } catch (e) {}
        } else {
          var userimg = com.userImg(app.user.id)
          userimg.classList.add('this-user')
          users.insertBefore(userimg, users.firstChild)
        }
      }
    })
  }
}

function onflag (msg) {
  return function (e) {
    e.preventDefault()
    e.stopPropagation()
    ui.dropdown(e.target, [
      { value: 'nsfw',  label: 'NSFW',  title: 'Graphic or adult content' },
      { value: 'spam',  label: 'Spam',  title: 'Off-topic or nonsensical' },
      { value: 'abuse', label: 'Abuse', title: 'Harrassment or needlessly derogatory' }
    ], function (value) {
      if (!value) return
      // publish flag
      app.ssb.publish(schemas.flag(msg.key, value), function (err, flagmsg) {
        if (err) {
          modals.error('Error While Publishing', err, 'This error occured while trying to flag a message.')
        } else {
          // render new flag
          msg.el.querySelector('.message-comments').appendChild(renderComment(flagmsg))
        }
      })
    })
  }
}

function updateFavBtn (el, b) {
  if (b)
    el.classList.add('selected')
  else
    el.classList.remove('selected')
  el.setAttribute('title', b ? 'Unfavorite this post' : 'Favorite this post')
}

var fetchState =
module.exports.fetchState = function (msg, opts) {
  // reply messages
  app.ssb.relatedMessages({ id: msg.key, count: true }, function (err, thread) {
    if (!thread || !thread.related) {
      if (opts && opts.fullview)
        msg.el.appendChild(com.composer(msg, msg, { onpost: onpostreply(msg, opts) }))
      if (opts && opts.markread)
        app.ssb.patchwork.markRead(msg.key)
      return
    }

    u.decryptThread(thread, function () {
      // copy the original message's value over, in case it was decrypted above
      thread.value = msg.value

      // handle votes, flags
      renderSignals(msg.el, thread)

      // get comments
      var cids = {}
      var comments = thread.related.filter(function (r) {
        if (cids[r.key]) return false // only appear once
        cids[r.key] = 1
        var c = r.value.content
        if (c.type == 'flag' && c.flag && c.flag.reason && !isFlagUndone(r))
          return true // render a flag if it's still active
        return (c.type == 'post') && isaReplyTo(r, msg)
      })

      // render composer now that we know the last message, and thus can give the branch link
      if (opts && opts.fullview)
        msg.el.appendChild(com.composer(thread, comments[comments.length - 1] || thread, { onpost: onpostreply(msg, opts) }))

      // render comments
      if (opts && opts.fullview)
        renderComments()
      else {
        if (opts && opts.markread)
          app.ssb.patchwork.markRead(thread.key) // go ahead and mark the root read
        if (comments.length)
          msg.el.querySelector('.comment-count-digits').innerText = comments.length + (comments.length == 1?' reply':' replies')
      }
      function renderComments (e) {
        e && e.preventDefault()

        // render
        var commentsEl = msg.el.querySelector('.message-comments')
        var existingCommentEl = commentsEl.firstChild
        comments.forEach(function (comment) {
          commentsEl.insertBefore(renderComment(comment), existingCommentEl)
        })

        // mark read
        if (opts && opts.markread) {
          var ids = [thread.key].concat(comments.map(function (c) { return c.key }))
          app.ssb.patchwork.markRead(ids)
        }
      }
    })
  })
}

function renderComment (msg, encryptionNotice) {
  var el = h('.message',
    { 'data-key': msg.key },
    com.userImg(msg.value.author),
    h('.message-inner',
      h('ul.message-header.list-inline',
        h('li', com.user(msg.value.author)),
        h('li', h('small', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true)))),
        (msg.plaintext === false) ? h('li', com.icon('lock')) : '',
        h('li.pull-right', h('a', { href: '#', onclick: onflag(msg), title: 'Flag this post' }, com.icon('flag'))),
        h('li.favorite.pull-right',
          h('span.users'),
          h('a', { href: '#', onclick: onfavorite(msg), title: 'Favorite this post' }, com.icon('star'))
        )
      ),
      h('.message-body',
        ((encryptionNotice) ?
          (msg.plaintext ?
            h('em.text-danger.pull-right', 'Warning: This comment was not encrypted!') :
            h('span.pull-right', com.icon('lock')))
          : ''),
        com.messageContent(msg)
      ),
      h('ul.message-footer.list-inline',
        h('li.pull-right', h('small', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true))))
      )
    )
  )
  msg.el = el // attach for handlers
  renderSignals(el, msg)

  // unread
  app.ssb.patchwork.isRead(msg.key, function (err, isread) {
    if (!err && !isread)
      msg.el.classList.add('unread')
  })

  return el
}

function isaReplyTo (a, b) {
  var c = a.value.content
  return (c.root && mlib.link(c.root).link == b.key || c.branch && mlib.link(c.branch).link == b.key)
}
function isaMentionOf (a, b) {
  var c = a.value.content
  return mlib.links(c.mentions).filter(function(l) { return l.link == b.key }).length !== 0
}

function renderSignals (el, msg) {
  if (!msg || !msg.related)
    return

  // collect mentions and votes
  var mentions = []
  var upvoters = {}, flaggers = {}
  msg.related.forEach(function (r) {
    var c = r.value.content
    if (c.type === 'vote') {
      if (c.vote.value === 1)
        upvoters[r.value.author] = 1
      else
        delete upvoters[r.value.author]
    }
    else if (c.type == 'flag') {
      if (c.flag && c.flag.reason)
        flaggers[r.value.author] = c.flag.reason
      else
        delete flaggers[r.value.author]
    }
    else if (c.type == 'post') {
      if (!isaReplyTo(r, msg) && isaMentionOf(r, msg))
        mentions.push(r)
    }
  })

  // update vote ui
  if (upvoters[app.user.id])
    updateFavBtn(el.querySelector('.message-header .favorite a'), true)
  upvoters = Object.keys(upvoters)
  var nupvoters = upvoters.length

  var favusers = el.querySelector('.message-header .favorite .users')
  favusers.innerHTML = ''
  upvoters.slice(0, 5).forEach(function (id) {
    var userimg = com.userImg(id)
    favusers.appendChild(userimg)
  })
  if (nupvoters > 5)
    favusers.appendChild(h('span', '+', nupvoters-5))

  // handle flags
  el.classList.remove('flagged-nsfw', 'flagged-spam', 'flagged-abuse')
  for (var k in flaggers) {
    // use the flag if we dont follow the author, or if we follow the flagger
    // (that is, dont use flags by strangers on people we follow)
    if (k == app.user.id || !social.follows(app.user.id, msg.value.author) || social.follows(app.user.id, k))
      el.classList.add('flagged-'+flaggers[k])
  }

  // render mentions
  if (mentions.length) {
    el.querySelector('.message-inner').appendChild(h('.message-mentions', mentions.map(renderMention)))
  }
}

function fetchAndRenderReplyLink (msg) {
  var root   = mlib.link(msg.value.content.root)
  var branch = mlib.link(msg.value.content.branch)
  if (!root) return ''

  var anchor = h('a.text-muted', { href: '#/msg/'+root.link }, 'replies to...')
  app.ssb.get((branch && branch.link) ? branch.link : root.link, function (err, msg) {
    if (!msg) return

    var text = '@' + com.userName(msg.author)
    if (msg.content.text && typeof msg.content.text == 'string')
      text += ': ' + markdown.inline(msg.content.text)
    if (text.length > 60)
      text = text.slice(0, 57) + '...'

    anchor.textContent = text
  })
  return h('p', { style: 'margin-bottom: 1em; background: #fafafa; padding: 5px' }, anchor)
}

function renderMention (m) {
  var text = m.value.content.text
  if (text.length > 40)
    text = text.slice(0, 37) + '...'
  if (text)
    text = ': ' + text
  return h('div', h('a', { href: '#/msg/'+m.key }, '↳ @', com.userName(m.value.author), text))
}

function isFlagUndone (r) {
  if (r.related) {
    return r.related.filter(function (msg) {
      var c = msg.value.content
      return (mlib.link(c.redacts) && mlib.link(c.redacts).link == r.key)
    }).length > 0
  }
  return false
}
