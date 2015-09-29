'use strict'
var h = require('hyperscript')
var o = require('observable')
var schemas = require('ssb-msg-schemas')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var pushable = require('pull-pushable')
var createHash = require('multiblob/util').createHash
var suggestBox = require('suggest-box')
var toBuffer = require('blob-to-buffer')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var com = require('./index')
var mentionslib = require('../mentions')

var videoOpts = {
  optional: [
    { minHeight: 150 },
    { maxHeight: 150 },
    { minWidth: 300 },
    { maxWidth: 300 }
  ]
}

module.exports = function (rootMsg, branchMsg, opts) {
  opts = opts || {}

  var blob
  var recordInterval
  var encoder = new Whammy.Video(10)
  var countdown = o(0)

  // markup

  var canvas = h('canvas')
  var context = canvas.getContext('2d')
  var invideo = h('video')
  var outvideo = h('video.hide', { autoplay: true, loop: true })
  var textarea = h('textarea.form-control', {
    name: 'text',
    placeholder: 'Add a message (optional)',
    rows: 6
  })
  var publishBtn = h('button.btn.btn-primary.pull-right.hidden', { onclick: onpublish }, 'Publish')
  var form = h('form.webcam-giffer-form',
    h('.webcam-giffer-form-videos', { onmousedown: onmousedown },
      o.transform(countdown, function (c) {
        if (!c)
          return ''
        return h('.countdown', c)
      }),
      invideo,
      outvideo,
      h('br'),
      h('a.btn.btn-3d', { onclick: onrecord(1) }, com.icon('record'), ' Record 1s'), ' ',
      h('a.btn.btn-3d', { onclick: onrecord(2) }, '2s'), ' ',
      h('a.btn.btn-3d', { onclick: onrecord(3), style: 'margin-right: 10px' }, '3s'),
      h('a.text-muted', { href: '#', onclick: onreset }, com.icon('repeat'), ' Reset')
    ),
    h('.webcam-giffer-form-ctrls', textarea, publishBtn)
  )
  suggestBox(textarea, app.suggestOptions)

  function disable () {
    publishBtn.classList.add('hidden')
  }

  function enable () {
    publishBtn.classList.remove('hidden')
  }

  // handlers

  function onmousedown (e) {
    if (e.target.tagName == 'VIDEO') {
      e.preventDefault()
      startRecording()
      document.addEventListener('mouseup', onmouseup)
    }
  }
  function onmouseup (e) {
    e.preventDefault()
    stopRecording()
    document.removeEventListener('mouseup', onmouseup)
  }
  function onrecord (seconds) {
    return function (e) {
      e.preventDefault()
      startRecordingAfter(2, seconds)
    }
  }
  function onreset (e) {
    e && e.preventDefault()
    encoder.frames = []
    invideo.classList.remove('hide')
    outvideo.classList.add('hide')
    disable()
  }
  function onpublish (e) {
    e.preventDefault()

    var text = textarea.value || ''
    if (!blob)
      return

    disable()
    ui.pleaseWait(true)

    // abort if the rootMsg wasnt decryptable
    if (rootMsg && typeof rootMsg.value.content == 'string') {
      ui.pleaseWait(false)
      ui.notice('danger', 'Unable to decrypt rootMsg message')
      enable()
      return 
    }

    function onerr (err) {
      ui.setStatus(null)
      ui.pleaseWait(false)
      enable()
      modals.error('Error While Publishing', err, 'This error occurred while trying to upload a webcam video to the blobstore.')
    }

    // upload blob to sbot
    var hasher = createHash('sha256')
    var ps = pushable()
    pull(
      ps,
      hasher,
      app.ssb.blobs.add(function (err) {
        if (err) return onerr(err)
        afterUpload()
      })
    )
    toBuffer(blob, function (err, buffer) {
      if (err) return onerr(err)
      ps.push(buffer)
      ps.end()
    })

    function afterUpload () {
      // prepend the image-embed ot the text
      text = '![webcam.webm](&'+hasher.digest+')\n\n' + text
      console.log('posting', text)

      // prep text
      mentionslib.extract(text, function (err, mentions) {
        if (err) {
          ui.setStatus(null)
          ui.pleaseWait(false)
          enable()
          if (err.conflict)
            modals.error('Error While Publishing', 'You follow multiple people with the name "'+err.name+'." Go to the homepage to resolve this before publishing.')
          else
            modals.error('Error While Publishing', err, 'This error occurred while trying to extract the mentions from the text of a webcam post.')
          return
        }

        // get encryption recipients from rootMsg
        var recps
        try {
          if (Array.isArray(rootMsg.value.content.recps)) {
            recps = mlib.links(rootMsg.value.content.recps)
              .map(function (recp) { return recp.link })
              .filter(Boolean)
          }
        } catch (e) {}

        // post
        var post = schemas.post(text, rootMsg && rootMsg.key, branchMsg && branchMsg.key, mentions, recps)
        if (recps)
          app.ssb.private.publish(post, recps, published)
        else
          app.ssb.publish(post, published)

        function published (err, msg) {
          ui.setStatus(null)
          enable()
          ui.pleaseWait(false)
          if (err) modals.error('Error While Publishing', err, 'This error occurred while trying to post a webcam video.')
          else {
            textarea.value = ''
            app.ssb.patchwork.subscribe(msg.key)
            app.ssb.patchwork.markRead(msg.key)
            opts && opts.onpost && opts.onpost(msg)
            onreset()
          }
        }
      })
    }
  }


  // init webcam
  navigator.webkitGetUserMedia({ video: videoOpts, audio: false }, function (stream) {
    invideo.src = window.URL.createObjectURL(stream)
    invideo.onloadedmetadata = function () { invideo.play() }
    ui.onTeardown(function () {
      stream.stop()
    })
  }, function (err) {
    modals.error('Failed to Access Webcam', err)
  })

  // recording functions
  function startRecordingAfter(c, seconds) {
    // show input stream
    invideo.classList.remove('hide')
    outvideo.classList.add('hide')

    // run countdown
    countdown(c)
    var i = setInterval(function () {
      countdown(countdown() - 1)
      if (countdown() === 0) {
        clearInterval(i)
        startRecording(seconds)
      }
    }, 1000)
  }
  function startRecording (seconds) {
    // show input stream
    invideo.classList.remove('hide')
    outvideo.classList.add('hide')

    // add 'recording' border
    invideo.classList.add('recording')

    // start capture
    recordInterval = setInterval(captureFrame, 1000/10)
    // captureFrame()
    if (seconds)
      setTimeout(stopRecording, seconds*1000)
  }
  function captureFrame () {
    context.drawImage(invideo, 0, 0, 300, 150)
    encoder.add(canvas)
  }
  function stopRecording () {
    // stop capture
    clearInterval(recordInterval)

    // remove 'recording' border
    invideo.classList.remove('recording')

    // produce output
    if (encoder.frames && encoder.frames.length) {
      blob = encoder.compile()
      console.log('Webm video encoded:', blob.size, 'bytes')
      outvideo.src = URL.createObjectURL(blob, 'video/webm')

      // show output stream
      invideo.classList.add('hide')
      outvideo.classList.remove('hide')
    } else {
      // show input stream
      invideo.classList.remove('hide')
      outvideo.classList.add('hide')
    }
    enable()
  }

  return form
}