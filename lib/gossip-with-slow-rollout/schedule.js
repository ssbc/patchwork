var nonPrivate = require('non-private-ip')
var ip = require('ip')
var onWakeup = require('on-wakeup')
var onNetwork = require('on-change-network')

var Stats = require('statistics')
var os = require('os')
var pull = require('pull-stream')
var u = require('scuttlebot/lib/util')

function rand(array) {
  return array[~~(Math.random()*array.length)]
}

function not (fn) {
  return function (e) { return !fn(e) }
}

function and () {
  var args = [].slice.call(arguments)
  return function (value) {
    return args.every(function (fn) { return fn.call(null, value) })
  }
}

//min delay (delay since last disconnect of most recent peer in unconnected set)
//unconnected filter delay peer < min delay
function delay (failures, factor, max) {
  return Math.min(Math.pow(2, failures)*factor, max || Infinity)
}

function maxStateChange (M, e) {
  return Math.max(M, e.stateChange || 0)
}

function peerNext(peer, opts) {
  return (peer.stateChange|0) + delay(peer.failure|0, opts.factor, opts.max)
}


//detect if not connected to wifi or other network
//(i.e. if there is only localhost)

function isOffline (e) {
  if(ip.isLoopback(e.host)) return false
  var lo = Object.keys(os.networkInterfaces())
  return lo.length === 1 && lo[0] === 'lo'
}

var isOnline = not(isOffline)

function isLocal (e) {
  // don't rely on private ip address, because
  // cjdns creates fake private ip addresses.
  return ip.isPrivate(e.host) && e.type === 'local'
}

function isFollowing (e) {
  return e.source === 'self'
}

function isUnattempted (e) {
  return !e.stateChange
}

//select peers which have never been successfully connected to yet,
//but have been tried.
function isInactive (e) {
  return e.stateChange && e.duration.mean == 0
}

function isLongterm (e) {
  return e.ping && e.ping.rtt.mean > 0
}

//peers which we can connect to, but are not upgraded.
//select peers which we can connect to, but are not upgraded to LT.
//assume any peer is legacy, until we know otherwise...
function isLegacy (peer) {
  return peer.duration.mean > 0 && !exports.isLongterm(peer)
}

function isConnect (e) {
  return 'connected' === e.state || 'connecting' === e.state
}

//sort oldest to newest then take first n
function earliest(peers, n) {
  return peers.sort(function (a, b) {
    return a.stateChange - b.stateChange
  }).slice(0, Math.max(n, 0))
}

function select(peers, ts, filter, opts) {
  if(opts.disable) return []
  //opts: { quota, groupMin, min, factor, max }
  var type = peers.filter(filter)
  var unconnect = type.filter(not(isConnect))
  var count = Math.max(opts.quota - type.filter(isConnect).length, 0)
  var min = unconnect.reduce(maxStateChange, 0) + opts.groupMin
  if(ts < min) return []

  return earliest(unconnect.filter(function (peer) {
    return peerNext(peer, opts) < ts
  }), count)
}

var schedule = exports = module.exports =
function (gossip, config, server) {

  var min = 60e3, hour = 60*60e3

  //trigger hard reconnect after suspend or local network changes
  onWakeup(gossip.reconnect)
  onNetwork(gossip.reconnect)

  function conf(name, def) {
    if(!config.gossip) return def
    var value = config.gossip[name]
    return (value === undefined || value === '') ? def : value
  }

  function connect (peers, ts, name, filter, opts) {
    var connected = peers.filter(isConnect).filter(filter)
      .filter(function (peer) {
        // don't disconnect from followed pubs
        return !isFollowing(peer) && peer.stateChange + 10e3 < ts
      })

    if(connected.length > opts.quota) {
      return earliest(connected, connected.length - opts.quota)
        .forEach(function (peer) {
          gossip.disconnect(peer)
        })
    }

    select(peers, ts, and(filter, isOnline), opts)
      .forEach(function (peer) {
        gossip.connect(peer)
      })
  }


  var connecting = false
  function connections () {
    if(connecting) return
    connecting = true
    setTimeout(function () {
    connecting = false
    var ts = Date.now()
    var peers = gossip.peers()

//    if(Math.random() > 0.1) return

    connect(peers, ts, 'following', exports.isFollowing, {
        min: 0, quota: 5, factor: 0, max: 0, groupMin: 0,
        disable: !conf('global', true)
    })

    connect(peers, ts, 'attempt', exports.isUnattempted, {
        min: 0, quota: 1, factor: 2e3, max: 0, groupMin: 0,
        disable: !conf('global', true)
    })

    //quota, groupMin, min, factor, max
    connect(peers, ts, 'retry', exports.isInactive, {
        min: 0,
        quota: 3, factor: 5*60e3, max: 3*60*60e3, groupMin: 5*50e3
      })

    connect(peers, ts, 'legacy', exports.isLegacy, {
        quota: 3, factor: 5*min, max: 3*hour, groupMin: 5*min,
        disable: !conf('global', true)
      })

    connect(peers, ts, 'longterm', exports.isLongterm, {
      quota: 3, factor: 10e3, max: 10*min, groupMin: 5e3,
      disable: !conf('global', true)
    })

    connect(peers, ts, 'local', exports.isLocal, {
      quota: 3, factor: 2e3, max: 10*min, groupMin: 1e3,
      disable: !conf('local', true)
    })

    }, 100*Math.random())

  }

    pull(
      gossip.changes(),
      pull.drain(function (ev) {
        if(ev.type == 'disconnect')
          connections()
      })
    )

    var int = setInterval(connections, 2e3)
    if(int.unref) int.unref()

    connections()

}

exports.isUnattempted = isUnattempted
exports.isInactive = isInactive
exports.isLongterm = isLongterm
exports.isFollowing = isFollowing
exports.isLegacy = isLegacy
exports.isLocal = isLocal
exports.isConnectedOrConnecting = isConnect
exports.select = select
