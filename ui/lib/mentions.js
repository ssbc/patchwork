var mlib = require('ssb-msgs')
var ssbref = require('ssb-ref')
var app = require('./app')

var _mentionRegex = function() { return /([^A-z0-9_\-\/:]|^)([@%&](amp;)?[A-z0-9\._\-+=\/]*[A-z0-9_\-+=\/])/g }
var _httpURLRegex = function() { return /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/gi } // stolen from marked
var _hostRegex = function() { return /https?\:\/\/([^\/?#]+)/gi }

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
    var mentionRegex = _mentionRegex()
    while ((match = mentionRegex.exec(text))) {
      var ref = match[2]
      var name = ref.slice(1) // lose the sigil
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

    // look for HTTP urls that point to messages, and which we can (therefore) turn into mentions
    var httpURLRegex = _httpURLRegex()
    while ((match = httpURLRegex.exec(text))) {
      var href = match[0]
      var id = ssbref.extract(href)
      if (!id)
        continue // not an ssb id

      // already mentioned?
      if (id in mentionedIds)
        continue // skip

      var m = { link: id, href: href }
      var hostMatch = _hostRegex().exec(href) // try to extract host
      if (hostMatch)
        m.host = hostMatch[0]
      mentionedIds[id] = mentions.push(m) - 1
    }

    cb(null, mentions)
  })
}