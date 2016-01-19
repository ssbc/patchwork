console.log('Running electron preload')

// add context menu
window.addEventListener('contextmenu', require('./electron/context-menu'))

// add zoom controls
window.zoom = require('./electron/zoom')