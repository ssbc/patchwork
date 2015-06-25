var path = require('path')
var multicb = require('multicb')
var toPath = require('multiblob/util').toPath
var querystring = require('querystring')
var fs = require('fs')

// blob url parser
var re = /^blob:([a-z0-9\+\/=]+\.blake2s)\??(.*)$/i
var url_parse =
module.exports.url_parse = function (str) {
  var parts = re.exec(str)
  if (parts)
    return { hash: parts[1], qs: querystring.parse(parts[2]) }
}

// blob url builder
var url_stringify =
module.exports.url_stringify = function (hash, qs) {
  var url = 'blob:'+hash
  if (qs && typeof qs == 'object')
    url += '?' + querystring.stringify(qs)
  return url
}

module.exports = function (blobs_dir, checkout_dir) {
  return {
    // behavior for the blob: protocol
    protocol: function (request) {
      var protocol = require('protocol') // have to require here, doing so before app:ready causes errors
      // simple fetch
      var parsed = url_parse(request.url)
      if (request.method == 'GET' && parsed) {
        return new protocol.RequestFileJob(toPath(blobs_dir, parsed.hash))
      }
    },

    // copy file from blobs into given dir with nice name
    checkout: function (url, cb) {
      var parsed = url_parse(url)
      if (!parsed)
        return cb({ badUrl: true })
      
      var filename = parsed.qs.name || parsed.qs.filename || parsed.hash

      // check if we have the blob, at the same time find an available filename
      var done = multicb({ pluck: 1 })
      fs.stat(toPath(blobs_dir, parsed.hash), done())
      findFreeCheckoutPath(filename, done())
      done(function (err, res) {
        if (!res[0])
          return cb({ notFound: true })

        // copy the file
        var src = toPath(blobs_dir, parsed.hash)
        var dst = res[1]
        var read = fs.createReadStream(src)
        var write = fs.createWriteStream(dst)
        read.on('error', done)
        write.on('error', done)
        write.on('close', done)
        read.pipe(write)
        function done (err) {
          cb && cb(err, dst)
          cb = null
        }
      })
    }
  }

  // helper to create a filename in checkout_dir that isnt already in use
  function findFreeCheckoutPath (filename, cb) {
    var n = 1
    var parsed = path.parse(filename)
    next()

    function gen () {
      var name = parsed.name
      if (n !== 1) name += ' ('+n+')'
      name += parsed.ext
      n++
      return path.join(checkout_dir, name)
    }

    function next () {
      var filepath = gen()
      fs.stat(filepath, function (err, stat) {
        if (!stat)
          return cb(null, filepath)
        next()
      })
    }
  }
}