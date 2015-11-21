'use strict'

// install babel hooks
require('babel/register')

var pull     = require('pull-stream')
var ReactDOM = require('react-dom')

// Init
// ====

// master state object
window.app = require('./lib/app')

// toplevel events
window.addEventListener('error', onError)

// render
app.fetchLatestState(function () {
  ReactDOM.render(require('./routes.jsx'), document.body.querySelector('div'))
})

// Handlers
// ========

function onError (e) {
  e.preventDefault()
  app.minorIssue('Unexpected Error', e.error, 'This was an unhandled exception.')
}