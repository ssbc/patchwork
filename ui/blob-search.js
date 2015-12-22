'use strict'
var ipc       = require('electron').ipcMain
var SSBClient = require('./lib/muxrpc-ipc')

var ssb = SSBClient()
var params = ipc.sendSync('fetch-params')
document.getElementById('fileid').innerHTML = params.hash

// periodically poll for the file
var poll = setInterval(pollBlob, 10e3)

function pollBlob () {
  console.log('checking...') //18e0c49bdf14018dd2ad7caafb4291630339615a0e306243c8cfffafb53233a2
  ssb.blobs.has(params.hash, function (err, has) {
    if (has || true) {
      console.log('blob found')
      clearInterval(poll)
      document.title = 'File Located - Secure Scuttlebutt'
      document.getElementById('content').innerHTML = '<h2>Your file has been found!</h2><p class="text-center"><strong><a href="'+params.url+'" target="_blank">Click here to open it.</a></strong></p>'
    } else
      console.log('not yet found')
  })
}
