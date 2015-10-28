'use strict'

// install babel hooks
require('babel/register')

var pull  = require('pull-stream')
var React = require('react')

// Init
// ====

// master state object
window.app = require('./lib/app')

// toplevel events
// window.addEventListener('error', onError)

// render
app.fetchLatestState(function () {
  React.render(require('./routes.jsx'), document.body)
})

// Handlers
// ========

function onError (e) {
  e.preventDefault()
  app.minorIssue('Unexpected Error', e.error, 'This was an unhandled exception.')
}