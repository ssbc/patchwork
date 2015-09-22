var h = require('hyperscript')
var NativeImage = require('native-image')
var createHash = require('multiblob/util').createHash
var pull = require('pull-stream')
var pushable = require('pull-pushable')
var app = require('../app')

if (!('URL' in window) && ('webkitURL' in window))
  window.URL = window.webkitURL

module.exports = function (opts) {
  opts = opts || {}
  
  // markup

  var fileInput = h('input', { type: 'file', accept: 'image/*', onchange: fileChosen })
  var canvas = h('canvas', { 
    onmousedown: onmousedown, 
    onmouseup:   onmouseup, 
    onmouseout:  onmouseup, 
    onmousemove: onmousemove, 
    width: 275, 
    height: 275
  })
  var zoomSlider = h('input', { type: 'range', value: 0, oninput: onresize })
  var existing = h('.image-uploader-existing', opts.existing ? h('img', { src: opts.existing }) : '')
  var viewer = h('div', existing, fileInput)
  var editormsg = h('small', 'drag to crop')
  var editor = h('.image-uploader-editor',
    { style: 'display: none' },
    editormsg, h('br'),
    canvas,
    h('p', zoomSlider),
    h('div',
      h('button.btn.btn-3d.pull-right.savebtn', { onclick: onsave }, 'OK'),
      h('button.btn.btn-3d', { onclick: oncancel }, 'Cancel')))
  var el = h('.image-uploader', viewer, editor)
  el.forceDone = forceDone.bind(el, opts)

  // handlers

  var img = h('img'), imgdim
  var dragging = false, mx, my, ox=0, oy=0, zoom=1, minzoom=1

  function draw () {
    var ctx = canvas.getContext('2d')
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, ox, oy, img.width * zoom, img.height * zoom)

    if (dragging)
      drawHexagonOverlay()
  }
  function drawHexagonOverlay () {
    // hexagon coords (based on the behavior of the css hexagon)
    var left = 20
    var right = canvas.width - 20
    var w12 = canvas.width / 2
    var h14 = canvas.height / 4
    var h34 = h14 * 3

    var ctx = canvas.getContext('2d')
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.globalAlpha = 0.75;
    ctx.globalCompositeOperation = 'overlay'
    ctx.beginPath()
    ctx.moveTo(w12,   0)
    ctx.lineTo(right, h14)
    ctx.lineTo(right, h34)
    ctx.lineTo(w12,   canvas.height)
    ctx.lineTo(left,  h34)
    ctx.lineTo(left,  h14)
    ctx.lineTo(w12,   0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  function fileChosen (e) {
    editor.style.display = 'block'
    viewer.style.display = 'none'
    editormsg.innerText = 'loading...'

    // give the html renderer a turn before loading the image
    // if the image is large, it'll block for a sec, and we want to render "loading..." first
    setTimeout(function () {
      var file = fileInput.files[0]
      var ni = NativeImage.createFromPath(file.path)
      img.src = ni.toDataUrl()

      imgdim = ni.getSize()
      var smallest = (imgdim.width < imgdim.height) ? imgdim.width : imgdim.height
      ox = oy = 0
      minzoom = zoom = 275/smallest
      zoomSlider.value = 0

      editormsg.innerText = 'drag to crop'
      draw()
    }, 100)

    /*
    :OLD: browser method, doesnt work in electron
    var reader = new FileReader()
    reader.onload = function (e) {
      ox = oy = 0
      zoom = 1
      zoomSlider.value = 50
      img.src = e.target.result

      draw()
      editor.style.display = 'block'
      viewer.style.display = 'none'
    }
    reader.readAsDataURL(file)
    */
  }

  function onmousedown (e) {
    e.preventDefault()
    dragging = true
    mx = e.clientX
    my = e.clientY
    draw()
  }

  function onmouseup (e) {
    e.preventDefault()
    dragging = false
    draw()
  }

  function onmousemove (e) {
    e.preventDefault()
    if (dragging) {
      ox = Math.max(Math.min(ox + e.clientX - mx, 0), -imgdim.width * zoom + 275)
      oy = Math.max(Math.min(oy + e.clientY - my, 0), -imgdim.height * zoom + 275)
      draw()
      mx = e.clientX
      my = e.clientY
    }
  }

  function onresize (e) {
    zoom = minzoom + (zoomSlider.value / 100)
    draw()
  }

  function onsave (e) {
    e.preventDefault()
    if (!opts.onupload)
      throw "onupload not specified"

    var hasher = createHash('sha256')
    var ps = pushable()
    pull(
      ps,
      hasher,
      app.ssb.blobs.add(function (err) {
        if(err)
          return modals.error('Failed to Upload Image to Blobstore', err)

        fileInput.value = ''
        editor.style.display = 'none'
        viewer.style.display = 'block'
        opts.onupload(hasher)
      })
    )

    // Send to sbot
    var dataUrl = canvas.toDataURL('image/png')
    existing.querySelector('img').setAttribute('src', dataUrl)
    ps.push(NativeImage.createFromDataUrl(dataUrl).toPng())
    ps.end()

    /*
    :OLD: browser method, doesnt work in electron
    canvas.toBlob(function (blob) {
      // Send to sbot
      var reader = new FileReader()
      reader.onloadend = function () {
        ps.push(new Buffer(new Uint8Array(reader.result)))
        ps.end()
      }
      reader.readAsArrayBuffer(blob)

      // Update "existing" img
      var blobUrl = URL.createObjectURL(blob)
      existing.querySelector('img').setAttribute('src', blobUrl)
      setTimeout(function() { URL.revokeObjectURL(blobUrl) }, 50) // give 50ms to render first
    }, 'image/png')
    */
  }

  function oncancel (e) {
    e.preventDefault()
    fileInput.value = ''
    editor.style.display = 'none'
    viewer.style.display = 'block'
  }

  return el
}

// helper to finish the edit in case the user forgets to press "OK"
function forceDone (opts, cb) {
  this.forceDone = null // detach for memory cleanup

  // not editing?
  if (this.querySelector('.image-uploader-editor').style.display != 'block')
    return cb() // we're good

  // update cb to run after onupload
  var onupload = opts.onupload
  opts.onupload = function (hasher) {
    onupload(hasher)
    cb()
  }
  this.querySelector('.savebtn').click() // trigger upload
}