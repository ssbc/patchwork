var path = require('path')
var fs = require('fs')
var rimraf = require('rimraf')
var osenv = require('osenv')
var multicb = require('multicb')
var ssbkeys = require('ssb-keys')

var createSbot = require('scuttlebot')
  .use(require('scuttlebot/plugins/master'))
  .use(require('scuttlebot/plugins/gossip'))
  .use(require('scuttlebot/plugins/friends'))
  .use(require('scuttlebot/plugins/replicate'))
  .use(require('scuttlebot/plugins/blobs'))
  .use(require('scuttlebot/plugins/invite'))
  .use(require('scuttlebot/plugins/block'))
  .use(require('scuttlebot/plugins/logging'))
  .use(require('scuttlebot/plugins/private'))
  .use(require('../'))

var n = 0
exports.newserver = function () {
  var dir = path.join(osenv.tmpdir(), 'phoenix-api-test'+(++n))
  rimraf.sync(dir)
  fs.mkdirSync(dir)

  return createSbot({ path: dir, keys: ssbkeys.generate() })
}

exports.makeusers = function (sbot, desc, cb) {
  var users = { alice: sbot.createFeed(sbot.keys) }
  var done = multicb()

  // generate feeds
  for (var name in desc) {
    if (!users[name])
      users[name] = sbot.createFeed(ssbkeys.generate())
    console.log(name+':', users[name].id)
  }

  // generate additional messages
  for (var name in desc) {  
    ;(desc[name].follows||[]).forEach(function (name2) {
      users[name].add({ type: 'contact', contact: users[name2].id, following: true }, done())
    })
    users[name].add({ type: 'contact', contact: users[name].id, name: name }, done())
  }

  done(function (err, msgs) {
    if (err) cb(err)
    else cb(null, users, msgs)
  })
}

exports.customTimeCreateMsg = function (keys, timestamp, content) {
  return ssbkeys.signObj(keys, {
    previous: null,
    author: keys.id,
    sequence: 1,
    timestamp: timestamp,
    hash: 'sha256',
    content: content,
  })
}