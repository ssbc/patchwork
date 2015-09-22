'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var mlib = require('ssb-msgs')
var ssbref = require('ssb-ref')
var multicb = require('multicb')
var app = require('../app')
var com = require('./index')
var u = require('../util')
var markdown = require('../markdown')

function shorten (str, n) {
  n = n || 120
  if (str.length > n)
    str = str.slice(0, n-3) + '...'
  return str
}

function getSummary (msg) {
  var c = msg.value.content

  function md (str) {
    return h('.markdown', { innerHTML: markdown.block(str, msg) })
  }
  try {
    var s = ({
      init: function () {
        return [com.icon('off'), ' created account.']
      },
      post: function () { 
        if (!c.text) return
        if (mlib.link(c.root, 'msg'))
          return [com.icon('share-alt'), ' replied ', ago(msg), h('a.msg-link', { style: 'color: #555', href: '#/msg/'+mlib.link(c.root).link }, shorten(c.text, 255))]
        if (mlib.links(c.mentions).filter(function(link) { return mlib.link(link).link == app.user.id }).length)
          return [com.icon('hand-right'), ' mentioned you ', ago(msg), h('a.msg-link', { style: 'color: #555', href: '#/msg/'+msg.key }, shorten(c.text, 255))]
        return md(c.text)
      },
      pub: function () {
        return [com.icon('cloud'), ' announced a public peer at ', c.address]
      },
      contact: function () {
        var subjects = mlib.links(c.contact).map(function (l) {
          if (l.link === msg.value.author)
            return 'self'
          if (l.link === app.user.id)
            return 'you'
          return com.user(l.link)
        })
        if (!subjects.length) return

        var items = []
        if (c.following === true)
          items.push(['followed ', subjects])
        else if (c.blocking === true)
          items.push(['blocked ', subjects])
        else if (c.following === false)
          items.push(['unfollowed ', subjects])
        else if (c.blocking === false)
          items.push(['unblocked ', subjects])

        if (items.length===0)
          return
        items.push([' ', ago(msg)])
        return items
      },
      vote: function () {
        var items
        var vote = mlib.link(c.vote)
        if (!vote)
          return

        if (vote.value > 0)
          items = [com.icon('star'), ' Starred ']
        else if (vote.value <= 0)
          items = [com.icon('erase'), ' Unstarred ']

        if (ssbref.isMsgId(vote.link))
          items.push(fetchMsgLink(vote.link))
        else if (ssbref.isFeedId(vote.link))
          items.push(com.user(vote.link))
        else if (ssbref.isBlobId(vote.link))
          items.push(com.a('#/webiew/'+vote.link, 'this file'))

        return items
      }
    })[c.type]()
    if (!s || s.length == 0)
      s = false
    return s
  } catch (e) { console.log(e); return '' }
}

module.exports = function (msg, opts) {

  // markup

  var content = getSummary(msg, opts)
  if (!content)
    return

  var msgSummary = h('.message-summary',
    com.userImg(msg.value.author),
    h('.message-summary-content', com.user(msg.value.author), ' ', content)
  )

  return msgSummary

}

module.exports.raw = function (msg, opts) {
  // markup

  var msgSummary = h('.message-summary',
    com.userImg(msg.value.author),
    h('.message-summary-content', 
      com.user(msg.value.author), ' ', ago(msg), ' ', h('small.pull-right', com.a('#/msg/'+msg.key, msg.key)),
      h('table.raw', com.prettyRaw.table(msg.value.content)
    ))
  )

  return msgSummary
}

function ago (msg) {
  var str = u.prettydate(new Date(msg.value.timestamp))
  if (str == 'yesterday')
    str = '1d'
  return h('small.text-muted', str, ' ago')
}

function fetchMsgLink (mid) {
  var link = h('a.msg-link', { href: '#/msg/'+mid }, 'this message')
  app.ssb.get(mid, function (err, msg) {
    if (msg) {
      console.log(msg)
      var str = (msg.content.type == 'post') ? msg.content.text : ('this '+msg.content.type)
      link.innerHTML = markdown.block(str, { key: mid, value: msg })
    }
  })
  return link
}