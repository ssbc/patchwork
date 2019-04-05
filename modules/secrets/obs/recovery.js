const nest = require('depnest')
const pull = require('pull-stream')
const pullParamap = require('pull-paramap')

const DarkCrystal = require('scuttle-dark-crystal')
// const isForwardRequest = require('scuttle-dark-crystal/isForwardRequest')
// const isForward = require('scuttle-dark-crystal/isForward')

const { h, Value } = require('mutant')

pull.paramap = pullParamap

const PENDING = 'pending'
const REQUESTED = 'requested'
const RECEIVED = 'received'

exports.gives = nest('secrets.obs.recovery')

exports.needs = nest({
  'sbot.obs.connection': 'first',
  'keys.sync.id': 'first'
})

exports.create = (api) => {
  return nest('secrets.obs.recovery', fetchRequests)

  var store = null

  function fetchRequests () {
    const scuttle = DarkCrystal(api.sbot.obs.connection)
    const { isForwardRequest, isForward } = scuttle.sync
    const id = api.keys.sync.id()

    if (!store) {
      store = Value()
      updateStore()
    }

    watchForUpdates()

    return store

    function updateStore () {
      var records = {

      }
    }

    function watchForUpdates () {
    }
  }
}

// [
//   {
//     id,
//     ritualId,
//     name,
//     quorum,
//     createdAt,
//     recipients: [ feedId  ],
//     shards: [
//       {
//         id,
//         feedId,
//         encryptedShard,
//         state,
//         shard,
//         requests: [
//           { request  },
//           { request, reply  }
//         ]
//       }
//     ]
//   }
// ]
