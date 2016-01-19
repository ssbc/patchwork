var webFrame = require('web-frame')

var zoomStep = 0.5
var zoom = +localStorage.zoom || 0
if (zoom) {
  webFrame.setZoomLevel(zoom)
}

function setZoom(z) {
  zoom = z
  webFrame.setZoomLevel(zoom)
  localStorage.zoom = z
}

module.exports = {
  setZoom: setZoom,
  zoomIn: function () {
    setZoom(zoom + zoomStep)
  },
  zoomOut: function () {
    setZoom(zoom - zoomStep)
  },
  zoomReset: function () {
    setZoom(0)
  }
}