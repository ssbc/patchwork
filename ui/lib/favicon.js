const ICON_PATH = '/img/icon.png'
const FONT = 'Helvetica, Arial, sans-serif'
var canvas = document.createElement('canvas')
var img = null
var label = false

module.exports.update = function (opts) {
  if ('label' in opts) {
    if (typeof opts.label == 'number' && opts.label > 0 && opts.label < 10)
      label = ' '+opts.label
    else
      label = opts.label
  }
  loadImg(draw)
}

function draw () {
  var head = document.getElementsByTagName('head')[0]
  var favicon = document.querySelector('link[rel=icon]')
  var newFavicon = document.createElement('link')
  var multiplier, fontSize, context, xOffset, yOffset, border, shadow

  // scale canvas elements based on favicon size
  multiplier = img.width / 16
  fontSize   = multiplier * 11
  xOffset    = multiplier
  yOffset    = multiplier * 11
  border     = multiplier
  shadow     = multiplier * 4

  canvas.height = canvas.width = img.width
  context = canvas.getContext('2d')
  context.font = 'bold ' + fontSize + 'px ' + FONT

  // draw favicon background
  if (label) { context.globalAlpha = 0.8 }
  context.drawImage(img, 0, 0)
  context.globalAlpha = 1.0

  if (label) {
    // draw drop shadow
    context.shadowColor = '#000'
    context.shadowBlur = shadow
    context.shadowOffsetX = 0
    context.shadowOffsetY = 0

    // draw border
    // context.fillStyle = '#000'
    // context.fillText(label, xOffset, yOffset)
    // context.fillText(label, xOffset + border, yOffset)
    // context.fillText(label, xOffset, yOffset + border)
    // context.fillText(label, xOffset + border, yOffset + border)

    // draw label
    context.fillStyle = '#FFF'
    context.fillText(label,
      xOffset + (border / 2.0),
      yOffset + (border / 2.0)
    )
  }

  // replace favicon with new favicon
  newFavicon.rel = 'icon'
  newFavicon.href = canvas.toDataURL('image/png')
  if (favicon) { head.removeChild(favicon) }
  head.appendChild(newFavicon)
}

var loadImgCbs
function loadImg (cb) {
  // already loaded?
  if (img)
    return cb() // go

  // queue active?
  if (loadImgCbs)
    return loadImgCbs.push(cb) // add to queue

  // start the queue
  loadImgCbs = [cb]

  // load image
  img = document.createElement('img')
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    loadImgCbs.forEach(cb => cb())
    loadImgCbs = null
  }
  img.src = ICON_PATH
}