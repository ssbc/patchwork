'use strict'

var pull     = require('pull-stream')
var ReactDOM = require('react-dom')

// Init
// ====

// master state object
window.app = require('./lib/app')
window.pull = pull // pull is useful for debugging

// toplevel events
window.addEventListener('error', onError)

// render
app.fetchLatestState(function () {
  var routes = require('./routes.jsx')
  ReactDOM.render(routes.routes, document.body.querySelector('div'))
  window.removeEventListener('error', window.loadErrorHandler)
})

// Handlers
// ========

function onError (e) {
  e.preventDefault()
  app.minorIssue('Unexpected Error', e.error || e, 'This was an unhandled exception.')
}