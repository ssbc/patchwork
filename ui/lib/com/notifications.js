var h = require('hyperscript')
var o = require('observable')
var app = require('../app')
var com = require('./index')

module.exports = function () {

  // markup

  var notes = []
  for (var k in app.actionItems) {
    var item = app.actionItems[k]
    if (item.type == 'name-conflict') {
      notes.push(h('.note.warning', 
        h('h3', 'Heads up!'),
        h('p', 'You are following more than one user named "'+item.name+'." You need to rename one of them to avoid confusion.'),
        h('ul.list-inline', item.ids.map(function (id) { return h('li', com.userImg(id), ' ', com.user(id)) }))
      ))
    }
  }

  return (notes.length) ? h('.notifications', notes) : null
}

module.exports.side = function () {
  return o.transform(app.observ.hasSyncIssue, function (b) {
    if (!b) return ''
    return h('.well', { style: 'margin-top: 5px' }, h('a.text-muted', { href: '#/sync' }, com.icon('warning-sign'), ' You\'re not connected to the public mesh.'))
  })
}