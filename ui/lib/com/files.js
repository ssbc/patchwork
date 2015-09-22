var h = require('hyperscript')
var com = require('./index')
var app = require('../app')
var u = require('../util')

module.exports = function (uid) {
  var el = h('.files-items')
  /*app.ssb.patchwork.*/getNamespace(uid, function (err, items) {
    if (!items) return
    items.forEach(function (item) {
      el.appendChild(file(uid, item))
    })
  })
  return h('.files', 
    h('.files-headers', h('div', 'Name'), h('div', 'File Size'), h('div', 'Modified')),
    el
  )
}

function file (uid, item) {
  return h('.file',
    h('.file-name',
      h('a', u.getExtLinkName(item)),
      h('.actions', 
        h('a', 'rename'),
        h('a', 'delete')
      )
    ),
    h('.file-size', u.bytesHuman(item.size)),
    h('.file-date', (new Date(item.timestamp)).toLocaleDateString())
  )
}

// :HACK: remove me
function getNamespace (uid, cb) {
  cb(null, [
    { name: 'cats.png', timestamp: Date.now(), size: 1503 },
    { name: 'WHOAMI.md', timestamp: Date.now()-100000, size: 51235 },
    { name: 'index.html', timestamp: Date.now()-1000440, size: 2234 },
    { name: 'index.js', timestamp: Date.now()-1001440, size: 35553 }
  ])
}