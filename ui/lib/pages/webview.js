'use strict'
var h = require('hyperscript')
var o = require('observable')
var com = require('../com')
var app = require('../app')
var ui = require('../ui')
var ssbref = require('ssb-ref')

module.exports = function (opts) {
  var param = (opts && opts.param) ? opts.param : app.page.param
  var port = (ssbref.isLink(param)) ? 7777 : 7778
  var url = 'http://localhost:' + port + '/' + param

  // markup

  var webview = com.webview({ url: url })
  ui.setPage('webview', h('.layout-grid',
    h('.layout-grid-col.webview-left', webview),
    (opts && opts.sideview) ? h('.layout-grid-col.webview-right', { style: showhide(app.observ.sideview) }, opts.sideview) : ''
  ), { onPageTeardown: function () {
    window.removeEventListener('resize', resize)
  }})

  function showhide (input) {
    return { display: o.transform(input, function (v) { return (v) ? 'block' : 'none' }) }
  }

  // dynamically size various controls
  resize()
  window.addEventListener('resize', resize)
  function resize () {
    [
      [webview.querySelector('::shadow object'), 0],
      [document.querySelector('.webview-page .layout-grid'), 0],
      [document.querySelector('.webview-page .webview-left'), 0],
      [document.querySelector('.webview-page .webview-right'), 0]
    ].forEach(function (entry) {
      if (entry[0])
        entry[0].style.height = (window.innerHeight - 40 - entry[1]) + 'px'
    })
  }
}
