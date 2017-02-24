'use strict'
var pull = require('pull-stream')
var para = require('pull-paramap')
var Notify = require('pull-notify')
var Cat = require('pull-cat')
var Debounce = require('observ-debounce')
var mdm = require('mdmanifest')
var apidoc = require('scuttlebot/lib/apidocs').replicate
var MutantToPull = require('./mutant-to-pull')
var {Struct, Dict} = require('mutant')

var Pushable = require('pull-pushable')

// compatibility function for old implementations of `latestSequence`
function toSeq (s) {
  return typeof s === 'number' ? s : s.sequence
}

module.exports = {
  name: 'replicate',
  version: '2.0.0',
  manifest: mdm.manifest(apidoc),
  init: function (sbot, config) {
    var debounce = Debounce(200)
    var listeners = {}
    var newPeer = Notify()

    // keep track of sync progress and provide to client

    var start = null
    var count = 0
    var rate = 0
    var toSend = {}
    var peerHas = {}
    var pendingPeer = {}

    window.pendingPeer = pendingPeer

    var syncStatus = Struct({
      type: 'global',
      incomplete: 0,
      pendingCount: 0,
      pendingPeers: Dict({}, {fixedIndexing: true}),
      feeds: null,
      rate: 0
    })

    window.syncStatus = syncStatus

    debounce(function () {
      var incomplete = 0
      var totalPending = 0
      var feeds = Object.keys(toSend).length
      var peers = {}

      Object.keys(pendingPeer).forEach(function (peerId) {
        if (pendingPeer[peerId]) {
          totalPending += 1

          if (Object.keys(toSend).some(function (feedId) {
            if (peerHas[peerId] && peerHas[peerId][feedId]) {
              return peerHas[peerId][feedId] > toSend[feedId]
            }
          })) {
            incomplete += 1
          }

          peers[peerId] = pendingPeer[peerId]
        }
      })

      syncStatus.set({
        incomplete: incomplete,
        feeds: syncStatus.loadedFriends ? feeds : null,
        pendingPeers: peers,
        pending: totalPending,
        rate: rate
      }, {merge: true})
    })

    pull(
      sbot.createLogStream({old: false, live: true, sync: false, keys: false}),
      pull.drain(function (e) {
        // track writes per second, mainly used for developing initial sync.
        if (!start) start = Date.now()
        var time = (Date.now() - start) / 1000
        if (time >= 1) {
          rate = count / time
          start = Date.now()
          count = 0
        }
        var pushable = listeners[e.author]

        if (pushable && pushable.sequence === e.sequence) {
          pushable.sequence++
          pushable.forEach(function (p) {
            p.push(e)
          })
        }
        count++
        addPeer({id: e.author, sequence: e.sequence})
      })
    )

    sbot.createHistoryStream.hook(function (fn, args) {
      var upto = args[0] || {}
      var seq = upto.sequence || upto.seq

      if (this._emit) this._emit('call:createHistoryStream', args[0])

      // if we are calling this locally, skip cleverness
      if (this === sbot) return fn.call(this, upto)

      // keep track of each requested value, per feed / per peer.
      peerHas[this.id] = peerHas[this.id] || {}
      peerHas[this.id][upto.id] = seq - 1

      debounce.set()

      // handle creating lots of history streams efficiently.
      // maybe this could be optimized in map-filter-reduce queries instead?
      if (toSend[upto.id] == null || (seq > toSend[upto.id])) {
        upto.old = false
        if (!upto.live) return pull.empty()
        var pushable = listeners[upto.id] = listeners[upto.id] || []
        var p = Pushable(function () {
          var i = pushable.indexOf(p)
          pushable.splice(i, 1)
        })
        pushable.push(p)
        pushable.sequence = upto.sequence
        return p
      }
      return fn.call(this, upto)
    })

    // collect the IDs of feeds we want to request
    var opts = config.replication || {}
    opts.hops = opts.hops || 3
    opts.dunbar = opts.dunbar || 150
    opts.live = true
    opts.meta = true

    function localPeers () {
      if (!sbot.gossip) return
      sbot.gossip.peers().forEach(function (e) {
        if (toSend[e.key] == null) {
          addPeer({id: e.key, sequence: 0})
        }
      })
    }

    // also request local peers.
    if (sbot.gossip) {
      // if we have the gossip plugin active, then include new local peers
      // so that you can put a name to someone on your local network.
      var int = setInterval(localPeers, 1000)
      if (int.unref) int.unref()
      localPeers()
    }

    function loadedFriends () {
      syncStatus.loadedFriends = true
      debounce.set()
    }

    function addPeer (upto) {
      if (upto.sync) return loadedFriends()
      if (!upto.id) return console.log('invalid', upto)

      if (toSend[upto.id] == null) {
        toSend[upto.id] = Math.max(toSend[upto.id] || 0, upto.sequence || upto.seq || 0)
        newPeer({ id: upto.id, sequence: toSend[upto.id], type: 'new' })
        debounce.set()
      } else {
        toSend[upto.id] = Math.max(toSend[upto.id] || 0, upto.sequence || upto.seq || 0)
      }

      debounce.set()
    }

    // create read-streams for the desired feeds
    pull(
      sbot.friends.createFriendStream(opts),
      // filter out duplicates, and also keep track of what we expect to receive
      // lookup the latest sequence from each user
      para(function (data, cb) {
        if (data.sync) return cb(null, data)
        var id = data.id || data
        sbot.latestSequence(id, function (err, seq) {
          cb(null, {
            id: id, sequence: err ? 0 : toSeq(seq)
          })
        })
      }, 32),
      pull.drain(addPeer, loadedFriends)
    )

    function upto (opts) {
      opts = opts || {}
      var ary = Object.keys(toSend).map(function (k) {
        return { id: k, sequence: toSend[k] }
      })
      if (opts.live) {
        return Cat([pull.values(ary), pull.once({sync: true}), newPeer.listen()])
      }

      return pull.values(ary)
    }

    sbot.on('rpc:connect', function (rpc) {
      // this is the cli client, just ignore.
      if (rpc.id === sbot.id) return
      // check for local peers, or manual connections.
      localPeers()
      sbot.emit('replicate:start', rpc)
      rpc.on('closed', function () {
        sbot.emit('replicate:finish', toSend)
      })
      pull(
        upto({live: opts.live}),
        pull.drain(function (upto) {
          if (upto.sync) return
          var last = (upto.sequence || upto.seq || 0)
          pendingPeer[rpc.id] = (pendingPeer[rpc.id] || 0) + 1
          debounce.set()

          pull(
            rpc.createHistoryStream({
              id: upto.id,
              seq: last + 1,
              live: false,
              keys: false
            }),
            pull.through((msg) => {
              start = Math.max(start, msg.sequence)
            }),
            sbot.createWriteStream(function () {
              // TODO: do something with the error
              // this seems to be thrown fairly regularly whenever something weird happens to the stream

              pendingPeer[rpc.id] -= 1
              debounce.set()

              // all synched, now lets keep watching for live changes
              // need to handle this separately because there is no {sync: true} event with HistoryStream
              // and we want to notify the client that sync has completed

              pull(
                rpc.createHistoryStream({
                  id: upto.id,
                  seq: last + 1,
                  live: true,
                  keys: false
                }),
                sbot.createWriteStream(function () {
                  // TODO: handle error
                })
              )
            })
          )
        }, function (err) {
          if (err) {
            sbot.emit('log:error', ['replication', rpc.id, 'error', err])
          }
        })
      )
    })

    return {
      changes: function () {
        return MutantToPull(syncStatus)
      },
      upto: upto
    }
  }
}
