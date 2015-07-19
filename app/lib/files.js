var path = require('path')
var fs   = require('fs')

exports.server = function (req, res) {
  // function toBuffer() {
  //   return pull.map(function (s) { return Buffer.isBuffer(s) ? s : new Buffer(s, 'base64') })
  // }
  // local-host only
  if (req.socket.remoteAddress != '127.0.0.1' &&
      req.socket.remoteAddress != '::ffff:127.0.0.1' &&
      req.socket.remoteAddress != '::1') {
    console.log('Remote access attempted by', req.socket.remoteAddress)
    res.writeHead(403)
    return res.end('Remote access forbidden')
  }

  // restrict the CSP
  res.setHeader('Content-Security-Policy', 
    "default-src 'self' localhost:7777 'unsafe-inline' 'unsafe-eval' data:; "+
    "connect-src 'self'; "+
    "object-src 'none'; "+
    "frame-src 'none'; "+
    "sandbox allow-same-origin allow-scripts"
  )

  fs.createReadStream(req.url)
    .on('error', function () {
      res.writeHead(404)
      res.end('File not found')
    })
    .pipe(res)
}