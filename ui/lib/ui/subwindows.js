var h = require('hyperscript')
var com = require('../com')
var u = require('../util')
var social = require('../social-graph')

var subwindows = []
var makeSubwindow =
module.exports.subwindow = function (el, title, opts) {
  // create a context so we can release this window on close
  opts = opts || {}
  var icon = com.icon(opts.icon || 'th-large')
  var h2 = h.context()
  var canclose = true

  // markup

  var collapseToggleIcon = com.icon('chevron-down')
  var subwindow = h2('.subwindow',
    h2('.subwindow-toolbar',
      h2('.title', icon, ' ', h('span.title-text', title)),
      (opts.help) ? h2('a.help', { href: '#', onclick: onhelp }, com.icon('question-sign')) : '',
      (opts.url) ? h2('a.goto', { href: '#', onclick: ongoto, title: 'Go to page for '+title }, com.icon('arrow-right')) : '',
      h2('a', { href: '#', onclick: oncollapsetoggle }, collapseToggleIcon),
      h2('a.close', { href: '#', onclick: onclose }, com.icon('remove'))
    ),
    h2('.subwindow-body', el)
  )
  document.body.appendChild(subwindow)

  subwindow.enableClose = function () { canclose = true }
  subwindow.disableClose = function () { canclose = false }

  subwindow.collapse = function () {
    subwindow.classList.add('collapsed')
    collapseToggleIcon.classList.remove('glyphicon-chevron-down')
    collapseToggleIcon.classList.add('glyphicon-'+(opts.icon || 'chevron-up'))
    reflow()
  }
  subwindow.expand = function () {
    subwindow.classList.remove('collapsed')
    collapseToggleIcon.classList.remove('glyphicon-'+(opts.icon || 'chevron-up'))
    collapseToggleIcon.classList.add('glyphicon-chevron-down')
    reflow()
  }

  subwindow.close = function (force) {
    if (!canclose)
      return

    // check if there are any forms in progress
    if (!force) {
      var els = Array.prototype.slice.call(subwindow.querySelectorAll('textarea'))
      for (var i=0; i < els.length; i++) {
        if (els[i].value) {
          if (!confirm('Lose changes to your draft?'))
            return
          break
        }
      }
    }

    // remove
    document.body.removeChild(subwindow)
    h2.cleanup()
    subwindows.splice(subwindows.indexOf(subwindow), 1)
    reflow()
    subwindow = null
  }

  // handlers

  function onclose (e) {
    e.preventDefault()
    subwindow.close()
  }

  function ongoto (e) {
    e.preventDefault()
    window.location = opts.url
  }

  function oncollapsetoggle (e) {
    e.preventDefault()
    if (subwindow.classList.contains('collapsed'))
      subwindow.expand()
    else
      subwindow.collapse()
  }

  function onhelp (e) {
    e.preventDefault()
    makeSubwindow(com.help.helpBody(opts.help), com.help.helpTitle(opts.help), { icon: 'question-sign' })
  }

  // manage

  subwindows.push(subwindow)
  reflow()

  return subwindow
}

module.exports.pm = function (opts) {

  // render

  opts = opts || {}
  opts.onpost = onpost
  var form = com.pmForm(opts)
  var sw = makeSubwindow(form, 'Secret Message', { icon: 'lock', help: 'secret-messages' })
  try { form.querySelector('input').focus() } catch (e) {}

  // handlers

  function onpost () {
    sw.close(true)
  }
}

module.exports.help = function (topic) {
  return makeSubwindow(com.help.helpBody(topic), com.help.helpTitle(topic), { icon: 'question-sign' })
}

module.exports.message = function (key) {
  app.ssb.get(key, function (err, msg) {
    if (err || !msg)
      require('../ui/subwindows').subwindow(h('p', 'Message Not Found'), 'Message')
    else {
      msg = { key: key, value: msg }
      var title = u.shortString(msg.value.content.text || 'Message Thread', 30)
      var sw = makeSubwindow(
        com.message(msg, { fullview: true, markread: true, live: true }), 
        title,
        { icon: 'envelope', url: '#/msg/'+msg.key }
      )
      sw.querySelector('.subwindow-body').style.background = '#eee'
    }
  })
}

module.exports.inbox = function () {
  var feedEl = com.messageFeed({ 
    feed: app.ssb.patchwork.createInboxStream,
    live: app.ssb.patchwork.createInboxStream({ gt: [Date.now(), null], live: true }),
    onempty: onempty
  })

  function onempty (feedEl) {
    feedEl.appendChild(h('p.text-center', { style: 'margin: 25px 0; padding: 10px; color: gray' }, 'Your inbox is empty!'))
  }

  var sw = makeSubwindow(feedEl, 'Inbox', { icon: 'inbox' })
  sw.querySelector('.subwindow-body').style.background = '#eee'
}

// reposition subwindows
var SPACING = 10
function reflow () {
  var right = SPACING
  subwindows.forEach(function (sw) {
    sw.style.right = right + 'px'
    if (sw.classList.contains('collapsed'))
      right += 50 + SPACING
    else
      right += 500 + SPACING
  })
}