var pull        = require('pull-stream')
var toPull      = require('stream-to-pull-stream')
var URL         = require('url')

module.exports = function () {
  var nowaitOpts = { nowait: true }, id = function(){}
  var sbot = require('./sbot').get()

  return function (req, res) {
    // local-host only
    if (req.socket.remoteAddress != '127.0.0.1' &&
        req.socket.remoteAddress != '::ffff:127.0.0.1' &&
        req.socket.remoteAddress != '::1') {
      sbot.emit('log:info', ['patchwork', null, 'Remote access attempted by', req.socket.remoteAddress])
      respond(403)
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

    // blobs
    var parsed = URL.parse(req.url, true)
    if (parsed.query.bundle) {
      // serve app bundle
      res.writeHead(200)
      res.end('<html><body><script src="http://localhost:7777'+parsed.pathname+'"></script></body></html>')
    }
    else if (req.url.charAt(1) == '&')
      serveblob(parsed.pathname.slice(1), parsed.query.fallback)
    else {
      respond(404)
      res.end('File not found')
    }
    function respond (code) {
      res.writeHead(code)
      sbot.emit('log:info', ['patchwork', null, code + ' ' + req.method + ' ' + req.url])
    }
    function serveblob (hash, fallback, isAutoIndex) {
      sbot.blobs.has(hash, function(err, has) {
        if (!has) {
          sbot.blobs.want(hash, nowaitOpts, id)
          respond(404)
          res.end('File not found')
          return
        }
        respond(200)
        pull(
          sbot.blobs.get(hash),
          toPull(res)
        )
      })
    }
  }
}