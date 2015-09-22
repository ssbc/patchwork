'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var schemas = require('ssb-msg-schemas')
var ssbref = require('ssb-ref')
var app = require('../app')
var modals = require('../ui/modals')
var com = require('./index')
var markdown = require('../markdown')

module.exports = function (msg) {
  var c = msg.value.content

  function md (str) {
    return h('.markdown', { innerHTML: markdown.block(str, msg) })
  }
  try {
    var s = ({
      post: function () { 
        if (!c.text) return
        var recps = mlib.links(c.recps).map(function (r, n) { 
          var user = com.user(r.link, { thin: true })
          user[0].querySelector('.user-link').style.color = '#777'
          if (n < c.recps.length-1)
            return [user, ', ']
          return user
        })
        if (recps && recps.length)
          return h('div', h('p', 'To: ', recps), md(c.text))
        return md(c.text)
      },
      contact: function () {
        var subjects = mlib.links(c.contact).map(function (l) {
          if (l.link === msg.value.author)
            return 'self'
          return com.user(l.link)
        })
        if (!subjects.length) return

        if (c.following === true)
          return h('h4', com.icon('user'), ' Followed ', subjects)
        if (c.blocking === true)
          return h('h4', com.icon(''), ' Blocked ', subjects)
        if (c.following === false)
          return h('h4', com.icon('minus'), ' Unfollowed ', subjects)
        if (c.blocking === false)
          return h('h4', com.icon('erase'), ' Unblocked ', subjects)
      },
      about: function () {
        var about = mlib.link(c.about)
        if (about.link == msg.value.author) {
          if (c.image && c.name)
            return h('h4', 'Set their image, and changed their name to ', c.name)
          if (c.image)
            return h('h4', 'Set their image')
          if (c.name)
            return h('h4', 'Changed their name to ', c.name)
        } else {
          if (c.name)
            return h('h4', 'Set ', com.user(about.link), '\'s name to ', c.name)
        }
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
      },
      flag: function () { 
        var del
        var flag = mlib.link(c.flag)
        if (!flag)
          return
        if (app.user.id == msg.value.author) {
          del = h('a.text-danger', { href: '#', onclick: onunflag, title: 'Remove this flag' }, h('small', com.icon('trash')))
          function onunflag (e) {
            e.preventDefault()
            var p = del.parentNode
            p.innerHTML = '<em>Flag removed</em>'
            p.classList.remove('text-danger')
            p.classList.add('text-muted')

            // publish unflag
            app.ssb.publish(schemas.unflag(mlib.link(c.flag).link, msg.key), function (err, flagmsg) {
              if (err) {
                modals.error('Error While Publishing', err, 'This error occured while trying to publish an unflag.')
              }
            })
          }
        }

        if (ssbref.isFeedId(flag.link)) {
          var target = com.userlink(flag.link)
          if (!flag.reason)
            return h('h4.text-danger', com.icon('erase'), ' Unflagged ', target)
          if (typeof flag.reason == 'string')
            return h('h4.text-danger', com.icon('flag'), ' Flagged ', target, ' as ', h('span.label.label-danger', flag.reason))
          return h('h4.text-danger', com.icon('flag'), ' Flagged ', target)
        } else {
          if (!flag.reason)
            return h('p.text-danger', com.icon('erase'), ' Unflagged ', target)
          if (typeof flag.reason == 'string')
            return h('p.text-danger', com.icon('flag'), ' ', h('span.label.label-danger', flag.reason), ' ', target, ' ', del)
          return h('p.text-danger', com.icon('flag'), ' Flagged ', target, ' ', del)
        }
      },
      pub: function () {
        var pub = mlib.link(c.pub)
        if (pub)
          return h('h4', com.icon('cloud'), ' Announced a public peer: ', com.user(pub.link), ' at ', pub.host, ':', pub.port)
      }
    })[c.type]()
    if (!s || s.length == 0)
      s = false
  } catch (e) {console.log(e)}

  if (!s)
    s = h('table.raw', com.prettyRaw.table(msg.value.content))

  return s
}

function fetchMsgLink (mid) {
  var link = com.a('#/msg/'+mid, 'this post')
  var linkspan = h('span', link)
  app.ssb.get(mid, function (err, msg) {
    if (msg) {
      linkspan.insertBefore(h('span', (msg.author == app.user.id) ? 'your ' : com.userName(msg.author) + '\'s', ' post'), link)
      link.style.display = 'block'
      link.style.padding = '8px 0'
      link.style.color = 'gray'
      link.textContent = link.innerText = shorten((msg.content.type == 'post') ? msg.content.text : msg.content.type, 255)
    }
  })
  return linkspan
}

function shorten (str, n) {
  n = n || 120
  if (str.length > n)
    str = str.slice(0, n-3) + '...'
  return str
}