const nest = require('depnest')
const pull = require('pull-stream')
const pullParamap = require('pull-paramap')
const { get, set, transform, sortBy } = require('lodash')

const DarkCrystal = require('scuttle-dark-crystal')

const { h, Array: MutantArray, throttle, onceTrue } = require('mutant')

pull.paramap = pullParamap

const RECEIVED = 'received'
const REQUESTED = 'requested'
const RETURNED = 'returned'

exports.gives = nest('secrets.obs.custody')

exports.needs = nest({
  'sbot.obs.connection': 'first',
  'keys.sync.id': 'first'
})

exports.create = (api) => {
  return nest('secrets.obs.custody', fetch)

  // store is an observable that returns an array of structure:
  // [
  //   { id: msgId, feedId: feedId, sentAt: timestamp, state: string, requests: [ { id: msgId, from: feedId, sentAt: timestamp } ] },
  //   { id: msgId, feedId: feedId, sentAt: timestamp, state: string, requests: [ { id: msgId, from: feedId, sentAt: timestamp } ] },
  // ]

  var store = null

  function fetch (props = {}) {
    const { limit = 100  } = props

    const scuttle = DarkCrystal(api.sbot.obs.connection)
    const id = api.keys.sync.id()

    if (!store) {
      store = MutantArray([])
      updateStore()
    }

    watchForUpdates()

    return throttle(store, limit)

    function updateStore () {
      const records = {
        // [id]: {
        //   { feedId, forwardRequests, forwards }
        // }
      }

      // Query Logic:
      //
      // get all shards that have an attachment name of gossip.json (are ssb identity shards)
      // for each shard:
      // - default state to RECEIVED
      // - get all forward-requests for shards whose author is the stated secretOwner (the requester)
      // - for each request:
      //   - reset the shard state to being REQUESTED
      //   - get all forwards, sent to the requester of the shard, that match the request in question (using branch ID)
      //   - if there is one, reset the state to RETURNED, and store the forwardId on the request
      // - get all forwards that match the root of the shard

      pull(
        scuttle.shard.pull.fromOthers({ reverse: true, live: false }),
        pull.filter(shard => get(shard, 'value.content.attachment.name') === 'gossip.json'),
        pull.paramap((shard, done) => {
          const id = shard.key
          const rootId = get(shard, 'value.content.root')
          const author = get(shard, 'value.author') // author of shard is secretOwner...

          set(records, [id, 'id'], id)
          set(records, [id, 'feedId'], author)
          set(records, [id, 'sentAt'], new Date(shard.value.timestamp))

          // shard state defaults to RECEIVED
          set(records, [id, 'state'], RECEIVED)

          pull(
            scuttle.forwardRequest.pull.bySecretOwner(author), // forSecretOwner
            pull.map(request => ({
              id: request.key,
              from: get(request, 'value.author'),
              sentAt: new Date(get(request, 'value.timestamp'))
            })),
            pull.paramap((request, next) => {
              // we don't _really_ know yet since it could have been for _any secret_,
              // however, in this context, we know because we're assuming other requests aren't yet in the system.
              set(records, [id, 'state'], REQUESTED)

              pull(
                scuttle.forward.pull.toOthers({ reverse: true, live: false }),
                pull.filter(fwd => notMe(get(fwd, 'value.content.recps')) === request.from), // all forward messages sent to the requester
                pull.filter(fwd => get(fwd, 'value.content.requestId') === request.id), // that are a reply to that specific request, assuming [0] is the request id
                pull.map(fwd => ({
                  id: fwd.key,
                  to: notMe(get(fwd, 'value.content.recps')),
                  sentAt: new Date(get(forwardMsg, 'value.timestamp'))
                })),
                pull.collect((err, forwardMsgs) => {
                  if (isEmpty(forwardMsgs)) next(null)
                  var forward = forwardMsgs[0] // there really should only ever be one...
                  set(records, [id, 'state'], RETURNED) // TODO: account for the timestamp, state may change...
                  set(request, 'forwardId', forward.id)
                  next(null)
                })
              )
            }, 10),
            pull.collect((err, requests) => {
              set(records, [id, 'requests'], requests)
              done(null)
            })
          )

          pull(
            scuttle.forward.pull.toOthers({ reverse: true, live: false }),
            pull.filter(fwd => get(fwd, 'value.content.root') === rootId),
            pull.map(fwd => ({
              id: fwd.key,
              sentAt: new Date(get(fwd, 'value.timestamp')),
              shareVersion: get(fwd, 'value.content.shareVersion'),
              shard: get(fwd, 'value.content.shard'),
              root: rootId
            })),
            pull.collect((err, forwards) => {
              set(records, [id, 'forwards', forwards])
            })
          )
        }, 10),
        pull.collect((err) => {
          if (err) return console.error(err)
          var recordsArray = transform(records, (acc, value, key, obj) => acc.push(obj), [])
          store.set(recordsArray)
        })
      )
    }

    function watchForUpdates () {
      pull(
        scuttle.shard.pull.fromOthers({ live: true, old: false }),
        pull.filter(m => !m.sync),
        pull.drain(m => updateStore())
      )

      pull(
        scuttle.forward.pull.toOthers({ live: true, old: false }),
        pull.filter(m => !m.sync),
        pull.drain(m => updateStore())
      )

      pull(
        scuttle.forwardRequest.pull.forOwnShards({ live: true, old: false }),
        pull.filter(m => !m.sync),
        pull.drain(m => updateStore())
      )
    }

    function notMe (recps) {
      return recps.find(recp => recp !== id)
    }
  }
}


      // %%TODO%% replace dummy data with real data
      // store.set([
      //   {
      //     id: '%g1gbRKarJT4au9De2r4aJ+MghFSAyQzjfVnnxtJNBBw=.sha256',
      //     feedId: '@NeB4q4Hy9IiMxs5L08oevEhivxW+/aDu/s/0SkNayi0=.ed25519',
      //     sentAt: '2015-9-19',
      //     state: RECEIVED,
      //     requests: [],
      //     forwards: []
      //   },
      //   {
      //     id: '%A1sldjgf923JT4au9De2r4aJ+MghFSAyQzjfVnnxtJNBBw=.sha256',
      //     feedId: '@NeB4q4Hy9IiMxs5L08oevEhivxW+/aDu/s/0SkNayi0=.ed25519',
      //     sentAt: '2017-11-05',
      //     state: REQUESTED,
      //     requests: [
      //       {
      //         id: '%F1gbRKarJT4au9De2r4aJ+MghFSAyQzjfVnnxtJNBBw=.sha256',
      //         from: '@2FK8RsIq7VkiU0jXi4CTd3L40xiivb6enRxZgXxT+pU=.ed25519',
      //         sentAt: '2018-4-12'
      //       }
      //     ],
      //     forwards: []
      //   },
      //   {
      //     id: '%RTgbRKarJT4au9De2r4aJ+MghFSAyQzjfVnnxtJNBBw=.sha256',
      //     feedId: '@NeB4q4Hy9IiMxs5L08oevEhivxW+/aDu/s/0SkNayi0=.ed25519',
      //     sentAt: '2017-11-05',
      //     state: RETURNED,
      //     requests: [
      //       {
      //         id: '%G1GBrkARjt4AU9dE2R4Aj+MghFSAyQzjfVnnxtJNBBw=.sha256',
      //         from: '@2FK8RsIq7VkiU0jXi4CTd3L40xiivb6enRxZgXxT+pU=.ed25519',
      //         sentAt: '2018-4-12',
      //         forwardId: '%g1gbRKarJT4au9De2r4aJ+MghFSAyQzjfVnnxtJNBBw=.sha256'
      //       }
      //     ],
      //     forwards: [
      //       {
      //         id: '%g1gbRKarJT4au9De2r4aJ+MghFSAyQzjfVnnxtJNBBw=.sha256',
      //         to: '@2FK8RsIq7VkiU0jXi4CTd3L40xiivb6enRxZgXxT+pU=.ed25519',
      //         sentAt: '2018-4-15'
      //       }
      //     ]
      //   }
      // ])
