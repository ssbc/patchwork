var h = require('hyperscript')
var router = require('phoenix-router')
var remote = require('remote')
var Menu = remote.require('menu')
var MenuItem = remote.require('menu-item')
var dialog = remote.require('dialog')
var ssbref = require('ssb-ref')
var app = require('../app')
var com = require('../com')
var u = require('../util')
var pages = require('../pages')

var _onPageTeardown
var _teardownTasks = []
var _hideNav = false

// re-renders the page
var refreshPage =
module.exports.refreshPage = function (e, cb) {
  e && e.preventDefault()
  var starttime = Date.now()

  // run the router
  var route = router('#'+(location.href.split('#')[1]||''), 'home')
  app.page.id    = route[0]
  app.page.param = route[1]
  app.page.qs    = route[2] || {}

  // update state
  app.fetchLatestState(function() {

    // re-route to setup if needed
    if (!app.users.names[app.user.id]) {
      _hideNav = true
      if (window.location.hash != '#/setup') {      
        window.location.hash = '#/setup'
        cb && (typeof cb == 'function') && cb()
        return
      }
    } else
      _hideNav = false

    // cleanup the old page
    h.cleanup()
    window.onscroll = null // commonly used for infinite scroll
    _onPageTeardown && _onPageTeardown()
    _onPageTeardown = null
    _teardownTasks.forEach(function (task) { task() })
    _teardownTasks.length = 0

    // render the new page
    var page = pages[app.page.id]
    if (!page)
      page = pages.notfound
    page()

    // clear pending messages, if home
    if (app.page.id == 'home')
      app.observ.newPosts(0)

    // metrics
    console.debug('page loaded in', (Date.now() - starttime), 'ms')
    cb && (typeof cb == 'function') && cb()
  })
}

var renderNav =
module.exports.renderNav = function () {
  var navEl = document.getElementById('page-nav')    
  if (_hideNav) {
    navEl.style.display = 'none'
  } else {
    navEl.style.display = 'block'
    navEl.innerHTML = ''   
    navEl.appendChild(com.pagenav())
    setNavAddress()
  }
}

// render a new page
module.exports.setPage = function (name, page, opts) {
  if (opts && opts.onPageTeardown)
    _onPageTeardown = opts.onPageTeardown

  // render nav
  renderNav()

  // render page
  var pageEl = document.getElementById('page-container')
  pageEl.innerHTML = ''
  if (!opts || !opts.noHeader)
    pageEl.appendChild(com.page(name, page))
  else
    pageEl.appendChild(h('#page.'+name+'-page', page))

  // scroll to top
  window.scrollTo(0, 0)
}
var setNavAddress =
module.exports.setNavAddress = function (location) {
  if (!location) {
    // pull from current page
    var location = app.page.id
    if (location == 'profile' || location == 'webview' || location == 'search' || location == 'msg')
      location = app.page.param
  }
  document.body.querySelector('#page-nav input').value = location
}
module.exports.onTeardown = function (cb) {
  _teardownTasks.push(cb)
}

module.exports.navBack = function (e) {
  e && e.preventDefault()
  e && e.stopPropagation()
  window.history.back()
}
module.exports.navForward = function (e) {
  e && e.preventDefault()
  e && e.stopPropagation()
  window.history.forward()
}
module.exports.navRefresh = function (e) {
  e && e.preventDefault()
  e && e.stopPropagation()
  refreshPage()
}

module.exports.contextMenu = function (e) {
  e.preventDefault()
  e.stopPropagation()

  var menu = new Menu()
  menu.append(new MenuItem({ label: 'Copy', click: oncopy }))
  menu.append(new MenuItem({ label: 'Select All', click: onselectall }))
  menu.append(new MenuItem({ type: 'separator' }))
  if (app.page.id == 'webview' && ssbref.isBlobId(app.page.param)) {
    menu.append(new MenuItem({ label: 'Save As...', click: onsaveas }))
    menu.append(new MenuItem({ type: 'separator' }))
  }
  menu.append(new MenuItem({ label: 'Open Devtools', click: function() { openDevTools() } }))
  menu.popup(remote.getCurrentWindow())

  function oncopy () {
    var webview = document.querySelector('webview')
    if (webview)
      webview.copy()
    else
      require('clipboard').writeText(window.getSelection().toString())
  }
  function onselectall () {
    var webview = document.querySelector('webview')
    if (webview)
      webview.selectAll()
    else {
      var selection = window.getSelection()
      var range = document.createRange()
      range.selectNodeContents(document.getElementById('page'))
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }
  function onsaveas () {
    var path = dialog.showSaveDialog(remote.getCurrentWindow())
    if (path) {
      app.ssb.patchwork.saveBlobToFile(app.page.param, path, function (err) {
        if (err) {
          alert('Error: '+err.message)
          console.error(err)
        } else
          notice('success', 'Saved to '+path, 5e3)
      })
    }
  }
}


var openDevTools =
module.exports.openDevTools = function () {
  var webview = document.querySelector('webview')
  if (webview)
    webview.openDevTools()
  else
    remote.getCurrentWindow().openDevTools()
}
var toggleDevTools =
module.exports.toggleDevTools = function () {
  var webview = document.querySelector('webview')
  if (webview) {
    if (webview.isDevToolsOpened())
      webview.closeDevTools()
    else
      webview.openDevTools()
  } else
    remote.getCurrentWindow().toggleDevTools()
}

var oldScrollTop
module.exports.disableScrolling = function () {
  oldScrollTop = document.body.scrollTop
  document.querySelector('html').style.overflow = 'hidden'
  window.scrollTo(0, oldScrollTop)
}
module.exports.enableScrolling = function () {
  document.querySelector('html').style.overflow = 'auto'
  window.scrollTo(0, oldScrollTop)
}


var setStatus =
module.exports.setStatus = function (message) {
  var status = document.getElementById('app-status')
  status.innerHTML = ''
  if (message) {
    if (message.indexOf('/profile/') === 0) {
      var id = message.slice('/profile/'.length)
      message = [h('strong', com.userName(id)), ' ', com.userRelationship(id)]
    } else if (message.indexOf('/msg/') === 0) {
      message = message.slice('/msg/'.length)
    }

    status.appendChild(h('div', message))
  }
}
var numNotices = 0
var notice =
module.exports.notice = function (type, message, duration) {
  var notices = document.getElementById('app-notices')
  var el = h('.alert.alert-'+type, message)
  notices.appendChild(el)
  function remove () {
    notices.removeChild(el)
  }
  setTimeout(remove, duration || 15e3)
  return remove
}


var pleaseWaitTimer, uhohTimer, tooLongTimer, noticeRemove
var pleaseWait =
module.exports.pleaseWait = function (enabled, after) {
  function doit() {
    // clear main timer
    clearTimeout(pleaseWaitTimer); pleaseWaitTimer = null
    noticeRemove && noticeRemove()
    noticeRemove = null

    if (enabled === false) {
      // hide spinner
      document.querySelector('#please-wait').style.display = 'none'
      setStatus(false)

      // clear secondary timers
      clearTimeout(uhohTimer); uhohTimer = null
      clearTimeout(tooLongTimer); tooLongTimer = null
    }
    else {
      // show spinner
      document.querySelector('#please-wait').style.display = 'block'

      // setup secondary timers
      uhohTimer = setTimeout(function () {
        noticeRemove = notice('warning', 'Hmm, this seems to be taking a while...')
      }, 5e3)
      tooLongTimer = setTimeout(function () {
        noticeRemove = notice('danger', 'I think something broke :(. Please restart Patchwork and let us know if this keeps happening!')
      }, 20e3)
    }
  }

  // disable immediately
  if (!enabled)
    return doit()

  // enable immediately, or after a timer (if not already waiting)
  if (!after)
    doit()
  else if (!pleaseWaitTimer)
    pleaseWaitTimer = setTimeout(doit, after)
}


module.exports.dropdown = function (el, options, opts, cb) {
  if (typeof opts == 'function') {
    cb = opts
    opts = null
  }
  opts = opts || {}

  // render
  var dropdown = h('.dropdown'+(opts.cls||'')+(opts.right?'.right':''),
    { onmouseleave: die },
    options.map(function (o) {
      if (o instanceof HTMLElement)
        return o
      if (o.separator)
        return h('hr')
      return h('a.item', { href: '#', onclick: onselect(o.value), title: o.title||'' }, o.label)
    })
  )
  if (opts.width)
    dropdown.style.width = opts.width + 'px'

  // position off the parent element
  var rect = el.getClientRects()[0]
  dropdown.style.top = (rect.bottom + document.body.scrollTop + 10 + (opts.offsetY||0)) + 'px'
  if (opts.right)
    dropdown.style.left = (rect.right + document.body.scrollLeft - (opts.width||200) + 5 + (opts.offsetX||0)) + 'px'
  else
    dropdown.style.left = (rect.left + document.body.scrollLeft - 20 + (opts.offsetX||0)) + 'px'

  // add to page
  document.body.appendChild(dropdown)
  document.body.addEventListener('click', die)

  // handler
  function onselect (value) {
    return function (e) {
      e.preventDefault()
      cb(value)
      die()
    }
  }
  function die () {
    document.body.removeEventListener('click', die)
    if (dropdown)
      document.body.removeChild(dropdown)
    dropdown = null
  }
}

module.exports.triggerFind = function () {
  var finder = document.body.querySelector('#finder')
  if (!finder) {
    document.body.appendChild(finder = com.finder())
    finder.querySelector('input').focus()
  } else {
    finder.find()
  }
}