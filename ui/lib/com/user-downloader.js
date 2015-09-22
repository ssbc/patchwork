'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var app = require('../app')
var modals = require('../ui/modals')
var ui = require('../ui')

module.exports = function (id) {
  var success = false, errored = false
  var btn = h('a.btn.btn-primary', { onclick: onclick }, 'Download User')

  function onclick () {
    btn.classList.add('disabled')
    btn.innerText = 'Searching...'
    pull(app.ssb.patchwork.useLookupCode(id), pull.drain(onLookupEvent, onLookupDone))
  }

  function onLookupEvent (e) {
    if (e.type == 'error' && e.message == 'Invalid lookup code')
      errored = true, modals.error('Error Downloading User', 'This is not a valid user ID: '+id, 'This error occurred while trying to download a user that wasn\'t locally available.')
    else if (e.type == 'connecting')
      btn.innerText = 'Asking '+e.addr.host
    else if (e.type == 'finished') {
      btn.innerText = 'Success!'
      success = true
    }
  }

  function onLookupDone () {
    btn.classList.remove('disabled')
    if (success)
      ui.refreshPage()
    else {
      if (!errored)
        modals.error('User Not Found', 'None of the available mesh nodes had this user\'s data. Make sure you\'re online, and that you have the right ID, then try again.', 'Attempted ID: '+id)
      btn.innerText = 'Try Download Again'
    }
  }

  return btn
}