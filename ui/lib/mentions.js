var mlib = require('ssb-msgs')
var ssbref = require('ssb-ref')
var app = require('./app')

var mentionRegex = 
exports.regex = /([^A-z0-9_\-\/:]|^)([@%&](amp;)?[A-z0-9\._\-+=\/]*[A-z0-9_\-+=\/])/g

function shorten (hash) {
  return hash.slice(0, 8) + '..' + hash.slice(-11)
}

exports.extract = function (text, cb) {
  app.ssb.patchwork.getIdsByName(function (err, idsByName) {
    if (err)
      return cb(err)

    // collect any mentions
    var match
    var mentions = [], mentionedIds = {}
    while ((match = mentionRegex.exec(text))) {
      var ref = match[2]
      var name = ref.slice(1) // lose the @
      var id = idsByName[name]

      // name conflict? abort
      if (Array.isArray(id))
        return cb({ conflict: true, name: name })

      if (ssbref.isFeedId(id)) {
        // mapped to a valid id?
        if (!(id in mentionedIds))
          mentionedIds[id] = mentions.push({ link: id, name: name }) - 1
        else
          mentions[mentionedIds[id]].name = name // make sure the name is set
      } else if (ssbref.isLink(ref)) {
        // is a valid id?
        if (!(ref in mentionedIds)) {
          mentionedIds[ref] = mentions.push({ link: ref }) - 1
        }
      }
    }

    cb(null, mentions)
  })
}