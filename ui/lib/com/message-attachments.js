var h = require('hyperscript')
var mlib = require('ssb-msgs')
var querystring = require('querystring')
var com = require('./index')
var u = require('../util')

var imageTypes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml'  
}
function isImage (link) {
  if (link.type && link.type.indexOf('image/') !== -1)
    return true
  if (link.name && imageTypes[link.name.split('.').slice(-1)[0].toLowerCase()])
    return true
}

module.exports = function (msg) {
  var els = []
  mlib.indexLinks(msg.value.content, { ext: true }, function (link, rel) {
    // var url = 'http://localhost:7777/'+link.link
    // var qs = { name: u.getExtLinkName(link) }
    // if (isImage(link))
    //   qs.fallback = 'img'
    // url += querystring.stringify(qs)
    var url = '#/webview/'+encodeURI(link.link)
    if (isImage(link))
      els.push(h('a', { href: url }, h('.image', { 'data-bg': 'http://localhost:7777/'+encodeURI(link.link), style: 'background-image: url(http://localhost:7777/'+encodeURI(link.link)+'?fallback=img)' })))
    else
      els.push(h('.file', h('a', { href: url }, com.icon('file'), ' ', link.name, ' ', h('small', (('size' in link) ? u.bytesHuman(link.size) : ''), ' ', link.type||''))))
  })
  return els.length ? h('.attachments', els) : undefined
}