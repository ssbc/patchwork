var pull   = require('pull-stream')
var toPull = require('stream-to-pull-stream')
var cat    = require('pull-cat')
var ident  = require('pull-identify-filetype')
var mime   = require('mime-types')
var URL    = require('url')
var fs     = require('fs')
var refs   = require('ssb-ref')
var Stack  = require('stack')

function respond (res, status, message) {
  res.writeHead(status)
  res.end(message)
}

function respondSource (res, source, wrap) {
  if(wrap) {
    res.writeHead(200, {'Content-Type': 'text/html'})
    pull(
      cat([
        pull.once('<html><body><script>'),
        source,
        pull.once('</script></body></html>')
      ]),
      toPull.sink(res)
    )
  }
  else {
    pull(
      source,
      ident(function (type) {
        if (type) res.writeHead(200, {'Content-Type': mime.lookup(type)})
      }),
      toPull.sink(res)
    )
  }
}

var Localhost = exports.Localhost = function () {
  return function (req, res, next) {
    if (req.socket.remoteAddress != '127.0.0.1' &&
        req.socket.remoteAddress != '::ffff:127.0.0.1' &&
        req.socket.remoteAddress != '::1') {
      respond(res, 403, 'Remote access forbidden')
    }
    next()
  }
}

var CSP = exports.CSP = function (origin) {
  return function (req, res, next) {
    res.setHeader('Content-Security-Policy', 
      "default-src "+origin+" 'unsafe-inline' 'unsafe-eval' data: ssb:; "+
      "object-src 'none'; "+
      "frame-src 'none'; "+
      "sandbox allow-same-origin allow-scripts allow-top-navigation allow-popups"
    )
    next()
  }
}

var ServeBlobs = exports.ServeBlobs = function (blobs) {
  return function (req, res, next) {
    var parsed = URL.parse(req.url)
    var hash = parsed.pathname.slice(1)
    blobs.has(hash, function(err, has) {
      if (!has) return respond(res, 404, 'File not found')
      var desigiledHash = hash.slice(1)
      respondSource(res, blobs.get(desigiledHash), false)
    })
  }
}

var ServeFiles = exports.ServeFiles = function () {
  return function (req, res, next) {
    var parsed = URL.parse(req.url, true)
    fs.stat(parsed.pathname, function (err, stat) {
      if(err) return respond(res, 404, 'File not found')
      if(!stat.isFile()) return respond(res, 403, 'May only load filess')
      respondSource(
        res,
        toPull.source(fs.createReadStream(parsed.pathname)),
        false
      )
    })
  }
}

exports.BlobStack = function (blobs, opts) {
  return Stack(
    Localhost(),
    CSP('http://localhost:7777'),
    ServeBlobs(blobs)
  )
}

exports.FileStack = function (opts) {
  return Stack(
    Localhost(),
    CSP('http://localhost:7777'),
    ServeFiles()
  )
}
