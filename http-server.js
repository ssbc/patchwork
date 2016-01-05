var pull   = require('pull-stream')
var toPull = require('stream-to-pull-stream')
var cat    = require('pull-cat')
var ident  = require('pull-identify-filetype')
var mime   = require('mime-types')
var URL    = require('url')
var path   = require('path')
var fs     = require('fs')
var refs   = require('ssb-ref')
var Stack  = require('stack')
var ip     = require('ip')

var AppCSP = function (config) {
  return "default-src 'self'; "+
    "connect-src 'self' ws://"+config.getHostname()+":7778 wss://"+config.getHostname()+":7778; "+
    "img-src 'self' data:; "+
    "object-src 'none'; "+
    "frame-src 'none'; "+
    "style-src 'self' 'unsafe-inline'; "+
    "sandbox allow-modals allow-same-origin allow-scripts allow-top-navigation allow-popups"
}
var BlobCSP = function () { return "default-src none; sandbox" }

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

var Log = exports.Log = function (sbot) {
  return function (req, res, next) {
    sbot.emit('log:info', ['HTTP', null, req.method + ' ' + req.url])
    next()
  }
}

var DeviceAccessControl = exports.DeviceAccessControl = function (config) {
  return function (req, res, next) {
    if (config.allowRemoteAccess())
      return next() // remote & local access allowed
    if (ip.isLoopback(req.socket.remoteAddress))
      return next() // local access allowed
    respond(res, 403, 'Remote access forbidden') // remote access disallowed
  }
}

var PasswordAccessControl = exports.DeviceAccessControl = function (config) {
  return function (req, res, next) {
    if (!config.requiresPassword(config))
      return next() // no password required

    // check the password
    var authMatch = /^Basic (.*)$/i.exec(req.headers.authorization)
    if (authMatch) {
      var password = (new Buffer(authMatch[1], 'base64').toString()).split(':')[1]
      if (password && config.checkPassword(password))
        return next() // password checks out
    }

    // deny
    res.setHeader('WWW-Authenticate', 'Basic realm=Authorization Required')
    respond(res, 401, 'Unauthorized')
  }
}

var ServeApp = exports.ServeApp = function (sbot, opts, config) {
  if (!opts || !opts.uiPath)
    throw "opts.uiPath is required"
  return function (req, res, next) {
    var parsed = URL.parse(req.url, true)
    var pathname = parsed.pathname
    if (pathname == '/')
      pathname = 'main.html'

    var filepath = path.join(opts.uiPath, pathname)
    fs.stat(filepath, function (err, stat) {
      if(err) return next()
      if(!stat.isFile()) return respond(res, 403, 'May only load files')

      if (pathname == 'main.html')
        res.setHeader('Content-Security-Policy', AppCSP(config)) // only give the open perms to main.html
      else
        res.setHeader('Content-Security-Policy', BlobCSP())

      respondSource(
        res,
        toPull.source(fs.createReadStream(filepath)),
        false
      )
    })
  }
}

var ServeBlobs = exports.ServeBlobs = function (sbot) {
  return function (req, res, next) {
    var parsed = URL.parse(req.url, true)
    var hash = decodeURIComponent(parsed.pathname.slice(1))
    sbot.blobs.want(hash, function(err, has) {
      if (!has) return respond(res, 404, 'File not found')

      // optional name override
      if (parsed.query.name)
        res.setHeader('Content-Disposition', 'inline; filename='+encodeURIComponent(parsed.query.name))

      // serve
      res.setHeader('Content-Security-Policy', BlobCSP())
      respondSource(res, sbot.blobs.get(hash), false)
    })
  }
}

var ServeFiles = exports.ServeFiles = function () {
  return function (req, res, next) {
    var parsed = URL.parse(req.url, true)
    fs.stat(parsed.pathname, function (err, stat) {
      if(err) return respond(res, 404, 'File not found')
      if(!stat.isFile()) return respond(res, 403, 'May only load files')
      res.setHeader('Content-Security-Policy', BlobCSP())
      respondSource(
        res,
        toPull.source(fs.createReadStream(parsed.pathname)),
        false
      )
    })
  }
}

exports.BlobStack = function (sbot, opts) {
  return Stack(
    Log(sbot),
    DeviceAccessControl(),
    ServeBlobs(sbot)
  )
}

exports.FileStack = function (opts) {
  return Stack(
    Log(sbot),
    DeviceAccessControl(),
    ServeFiles()
  )
}

exports.AppStack = function (sbot, opts, config) {
  return Stack(
    Log(sbot),
    PasswordAccessControl(config),
    DeviceAccessControl(config),
    ServeApp(sbot, opts, config),
    ServeBlobs(sbot)
  )
}
