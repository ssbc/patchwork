const nest = require('depnest')
const pull = require('pull-stream')
const pullParamap = require('pull-paramap')
const { get, set, transform, sortBy, isEmpty } = require('lodash')

const DarkCrystal = require('scuttle-dark-crystal')

const { h, Value, throttle, onceTrue } = require('mutant')

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

  var store = null

  function fetch (props = {}) {
    const { limit = 100 } = props

    const scuttle = DarkCrystal(api.sbot.obs.connection)
    const id = api.keys.sync.id()

    if (!store) {
      store = Value()
      updateStore()
    }

    watchForUpdates()

    return throttle(store, limit)

    function updateStore () {
      const records = {
        // [msgId]: {
        //   id: msgId,
        //   feedId: feedId,
        //   sentAt: timestamp,
        //   state: string,
        //   requests: [
        //     {
        //       id: msgId,
        //       feedId: feedId,
        //       sentAt: timestamp
        //     }
        //   ],
        //   forwards: [
        //     {
        //       id: msgId,
        //       to: feedId,
        //       sentAt: timestamp
        //     }
        //   ]
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
        pull.map(shard => ({
          id: shard.key,
          rootId: get(shard, 'value.content.root'),
          feedId: get(shard, 'value.author'),
          sentAt: new Date(get(shard, 'value.timestamp')),
          shard: get(shard, 'value.content.shard'),
          shareVersion: get(shard, 'value.content.shareVersion'),
          attachment: get(shard, 'value.content.attachment')
        })),
        pull.paramap((shard, done) => {
          set(records, [shard.id], shard)

          // shard state defaults to RECEIVED
          set(records, [shard.id, 'state'], RECEIVED)

          pull(
            scuttle.forwardRequest.pull.bySecretOwner(shard.feedId),
            pull.map(request => ({
              id: request.key,
              feedId: get(request, 'value.author'),
              sentAt: new Date(get(request, 'value.timestamp')),
              shardId: shard.id
            })),
            pull.paramap((request, next) => {
              // we don't _really_ know yet since it could have been for _any secret_,
              // however, in this context, we know because we're assuming other requests aren't yet in the system.
              set(records, [shard.id, 'state'], REQUESTED)

              pull(
                scuttle.forward.pull.toOthers({ reverse: true, live: false }),
                pull.filter(fwd => notMe(get(fwd, 'value.content.recps')) === request.feedId),
                pull.filter(fwd => get(fwd, 'value.content.requestId') === request.id),
                pull.map(fwd => ({
                  id: fwd.key,
                  to: notMe(get(fwd, 'value.content.recps')),
                  sentAt: new Date(get(fwd, 'value.timestamp'))
                })),
                pull.collect((err, forwards) => {
                  if (!isEmpty(forwards)) {
                    const [ forward ] = forwards
                    set(records, [shard.id, 'state'], RETURNED) // %%TODO%%: account for the timestamp, state may change...
                    set(request, 'forwardId', forward.id)
                  }
                  next(null, request)
                })
              )
            }, 10),
            pull.collect((err, requests) => {
              set(records, [shard.id, 'requests'], requests)
              done(null)
            })
          )

          pull(
            scuttle.forward.pull.toOthers({ reverse: true, live: false }),
            pull.filter(fwd => get(fwd, 'value.content.root') === shard.rootId),
            pull.map(fwd => ({
              id: fwd.key,
              sentAt: new Date(get(fwd, 'value.timestamp')),
              shareVersion: get(fwd, 'value.content.shareVersion'),
              shard: get(fwd, 'value.content.shard'),
              root: shard.rootId
            })),
            pull.collect((err, forwards) => {
              set(records, [shard.id, 'forwards', forwards])
            })
          )
        }, 10),
        pull.collect((err) => {
          if (err) return console.error(err)
          var recordsArray = transform(records, (acc, value, key, obj) => acc.push(value), [])
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
