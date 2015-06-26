var path        = require('path')
var multicb     = require('multicb')
var toPath      = require('multiblob/util').toPath
var createHash  = require('multiblob/util').createHash
var pull        = require('pull-stream')
var toPull      = require('stream-to-pull-stream')
var querystring = require('querystring')
var fs          = require('fs')

module.exports = function (blobs_dir, checkout_dir) {
  var fallback_img_path = path.join(__dirname, '../../node_modules/ssbplug-phoenix/img/default-prof-pic.png')

  return {
    // behavior for the blob: protocol
    protocol: function (request) {
      var protocol = require('protocol') // have to require here, doing so before app:ready causes errors
      // simple fetch
      var parsed = url_parse(request.url)
      if (request.method == 'GET' && parsed) {
        var filepath = toPath(blobs_dir, parsed.hash)
        try {
          // check if the file exists
          fs.statSync(filepath) // :HACK: make async when we figure out how to make a protocol-handler support that
          return new protocol.RequestFileJob(filepath)
        } catch (e) {
          // notfound
          if (parsed.qs.fallback == 'img')
            return new protocol.RequestFileJob(fallback_img_path)
          return new protocol.RequestErrorJob(-6)
        }
      }
    },

    // copy file from blobs into given dir with nice name
    checkout: function (url, cb) {
      var parsed = url_parse(url)
      if (!parsed)
        return cb({ badUrl: true })
      
      var filename = parsed.qs.name || parsed.qs.filename || parsed.hash

      // check if we have the blob, at the same time find an available filename
      var done = multicb()
      fs.stat(toPath(blobs_dir, parsed.hash), done())
      findCheckoutDst(filename, parsed.hash, done())
      done(function (err, res) {
        if (err && err.code == 'ENOENT')
          return cb({ notFound: true })

        // do we need to copy?
        var dst = res[1][1]
        var nocopy = res[1][2]
        if (nocopy)
          return cb(null, dst)

        // copy the file
        var src = toPath(blobs_dir, parsed.hash)
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
  // - cb(err, filepath, nocopy) - if nocopy==true, no need to do the copy operation
  function findCheckoutDst (filename, hash, cb) {
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
      var dst = gen()
      // exists?
      fs.stat(dst, function (err, stat) {
        if (!stat)
          return cb(null, dst, false)

        // yes, check its hash
        var hasher = createHash()
        pull(
          toPull.source(fs.createReadStream(dst)),
          hasher,
          pull.onEnd(function () {
            // if the hash matches, we're set
            if (hasher.digest == hash)
              return cb(null, dst, true)
            // try next
            next()
          })
        )
      })
    }
  }
}

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