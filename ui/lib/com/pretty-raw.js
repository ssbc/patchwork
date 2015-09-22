var h = require('hyperscript')
var ssbref = require('ssb-ref')
var com = require('./index')
var u = require('../util')

function file (link, rel) {
  var name = link.name || rel
  var details = (('size' in link) ? u.bytesHuman(link.size) : '') + ' ' + (link.type||'')
  return h('a', { href: '/ext/'+link.ext, target: '_blank', title: name +' '+details }, name, ' ', h('small', details))
}

function message (link, rel) {
  if (typeof rel == 'string')
    return h('a', { href: '#/msg/'+link.msg, innerHTML: u.escapePlain(rel)+' &raquo;' })
}

var prettyRaw =
module.exports = function (obj, path) {
  if (typeof obj == 'string')
    return h('span.pretty-raw', h('em', 'Encrypted message'))

  function col (k, v) {
    k = (k) ? path+k : ''
    return h('span.pretty-raw', h('small', k), v)
  }

  var els = []
  path = (path) ? path + '.' : ''
  for (var k in obj) {
    if (obj[k] && typeof obj[k] == 'object') {
      // :TODO: render links
      // if (obj[k].ext)
      //   els.push(col('', file(obj[k])))
      // if (obj[k].msg)
      //   els.push(col('', message(obj[k])))
      // if (obj[k].feed)
      //   els.push(col(k, com.user(obj[k].feed)))
      els = els.concat(prettyRaw(obj[k], path+k))
    }
    else
      els.push(col(k, ''+obj[k]))
  }

  return els
}

var prettyRawTable =
module.exports.table = function (obj, path) {
  if (typeof obj == 'string') {
    var el = h('tr.pretty-raw', h('td'), h('td.text-muted', 'Encrypted message'))

    // try to decrypt
    app.ssb.private.unbox(obj, function (err, decrypted) {
      if (decrypted) {
        var rows = prettyRawTable(decrypted)
        if (el.parentNode) {
          rows.forEach(function (row) {
            el.parentNode.appendChild(row)
          })
        }
      }
    })

    return el
  }

  function row (k, v) {
    if (typeof v === 'boolean')
      v = com.icon(v ? 'ok' : 'remove')
    return h('tr.pretty-raw', h('td', path+k), h('td', v))
  }

  var els = []
  path = (path) ? path + '.' : ''
  for (var k in obj) {
    if (obj[k] && typeof obj[k] == 'object') {
      els = els.concat(prettyRawTable(obj[k], path+k))
    } else if (ssbref.isLink(obj[k])) {
      var ref = obj[k]
      if (ssbref.isMsgId(ref))
        els.push(row(k, com.a('#/msg/'+ref, ref)))
      else if (ssbref.isBlobId(ref))
        els.push(row(k, com.a('#/webview/'+ref, obj.name || ref)))
      else
        els.push(row(k, com.user(ref)))
    } else
      els.push(row(k, obj[k]))

  }

  return els  
}