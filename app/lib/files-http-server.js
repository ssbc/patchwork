var fs = require('fs')
var URL = require('url')

module.exports = function () {
  return function (req, res) {
    // local-host only
    if (req.socket.remoteAddress != '127.0.0.1' &&
        req.socket.remoteAddress != '::ffff:127.0.0.1' &&
        req.socket.remoteAddress != '::1') {
      sbot.emit('log:info', ['patchwork', null, 'Remote access attempted by', req.socket.remoteAddress])
      res.writeHead(403)
      return res.end('Remote access forbidden')
    }

    // restrict the CSP
    res.setHeader('Content-Security-Policy', 
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; "+
      "connect-src 'self'; "+
      "object-src 'none'; "+
      "frame-src 'none'; "+
      "sandbox allow-same-origin allow-scripts"
    )


    var parsed = URL.parse(req.url, true)
    if (parsed.pathname.slice(-3) == '.js' && parsed.query.bundle) {
      // serve app bundle
      res.writeHead(200)
      res.end('<html><body><script src="http://localhost:7778'+parsed.pathname+'"></script></body></html>')
    }
    // serve file    
    return fs.createReadStream(parsed.pathname)
      .on('error', function () {
        res.writeHead(404)
        res.end('File not found')
      })
      .pipe(res)
  }
}