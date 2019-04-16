const nest = require('depnest')
const pull = require('pull-stream')
const pullParamap = require('pull-paramap')

const DarkCrystal = require('scuttle-dark-crystal')
const secrets = require('dark-crystal-secrets')
const { pickBy, identity, transform, get, set, isEmpty } = require('lodash')

const { h, Value } = require('mutant')

pull.paramap = pullParamap

// request states
const REQUESTED = 'requested'
const RECEIVED = 'received'

// recovery states
const PENDING = 'pending'
const READY = 'ready'

exports.gives = nest('secrets.obs.recovery')

exports.needs = nest({
  'sbot.obs.connection': 'first',
  'keys.sync.id': 'first'
})

exports.create = (api) => {
  return nest('secrets.obs.recovery', fetchRequests)

  var store = null

  function fetchRequests (recovery = {}) {
    const scuttle = DarkCrystal(api.sbot.obs.connection)
    const id = api.keys.sync.id()

    if (!store) {
      store = Value()
      updateStore()

      // Dummy data
      // store.set(
      //   {
      //     feedId: '@t9ZjSJ8yT3j7zfzaeL4MJAB26VU4afyBsB278NTKHN8=.ed25519',
      //     forwards: [
      //       {
      //         id: '%Ixuw+DCtK0jH2rgoyBngv5D/K+bS6DNHcHuysgXKF0I=.sha256',
      //         feedId: '@o3OcykTU7zdsm+WKoGl74XAoyDI/SWlVbIeyHHinQXQ=.ed25519',
      //         shard: 'this is the shard',
      //         shareVersion: '2.0.0',
      //         sentAt: new Date(),
      //         root: '%Ixuw+DCtK0jH2rgoyBngv5D/K+bS6DNHcHuysgXKF0I=.sha256',
      //         attachment: {
      //           name: 'gossip.json',
      //           link: '&Derun7ov8MguVIbMFpALxs+RpF0ekiq/C9hPWsvcWDU=.sha256'
      //         }
      //       },
      //       {
      //         id: '%em1tH7wE46pzuZuhiBt72AbWpRRO0i6Mvfk3lcPMjfs=.sha256',
      //         feedId: '@NeB4q4Hy9IiMxs5L08oevEhivxW+/aDu/s/0SkNayi0=.ed25519',
      //         shard: 'this is the shard',
      //         shareVersion: '2.0.0',
      //         sentAt: new Date(),
      //         root: '%em1tH7wE46pzuZuhiBt72AbWpRRO0i6Mvfk3lcPMjfs=.sha256',
      //         attachment: {
      //           name: 'gossip.json',
      //           link: '&Derun7ov8MguVIbMFpALxs+RpF0ekiq/C9hPWsvcWDU=.sha256'
      //         }
      //       },
      //     ],
      //     requests: [
      //       {
      //         id: '%WB5SxQlM9ur4QL1bwCHGLS7TNw46bz71hmKy2KMnEqo=.sha256',
      //         feedId: '@iL6NzQoOLFP18pCpprkbY80DMtiG4JFFtVSVUaoGsOQ=.ed25519',
      //         sentAt: new Date(),
      //         state: REQUESTED
      //       },
      //       {
      //         feedId: '@o3OcykTU7zdsm+WKoGl74XAoyDI/SWlVbIeyHHinQXQ=.ed25519',
      //         sentAt: new Date(),
      //         id: '%ICz7CjzREkynswt2qugA4c5GdJOK32XNMnmIL5aS9jE=.sha256',
      //         forwardId: '%Ixuw+DCtK0jH2rgoyBngv5D/K+bS6DNHcHuysgXKF0I=.sha256',
      //         state: RECEIVED
      //       },
      //       {
      //         feedId:  '@NeB4q4Hy9IiMxs5L08oevEhivxW+/aDu/s/0SkNayi0=.ed25519',
      //         sentAt: new Date(),
      //         id: '%WsLloD2TVbzhxn+WmEphGMHLDJKt0lFrVuH6KKFaMoA=.sha256',
      //         forwardId: '%em1tH7wE46pzuZuhiBt72AbWpRRO0i6Mvfk3lcPMjfs=.sha256',
      //         state: RECEIVED
      //       }
      //     ],
      //     state: READY,
      //     version: '2.0.0'
      //   }
      // )
    }

    watchForUpdates()

    return store

    function updateStore () {
      var records = {
        // [secretOwnerFeedId]: {
        //   feedId: feedId,
        //   forwards: {
        //     [feedId]: {
        //       id: msgId,
        //       feedId: feedId,
        //       shard: string,
        //       shareVersion: string,
        //       sentAt: datetime,
        //       root: msgId,
        //       attachment: { name: string, blobId: blobId }
        //     }
        //   },
        //   requests: {
        //     [feedId]: {
        //       id: msgId,
        //       sentAt: datetime,
        //       feedId: feedId,
        //       forwardId: msgId,
        //       state: string
        //     }
        //   },
        //   state: string
        //   version: string // this will be the forward's shareVersion
        // }
      }

      // Query Logic:
      //
      // get all forward-requests that we've sent
      // for each request:
      // - store the feedId
      // - store the recovery state as REQUESTED
      // - store the request
      // - get all forwards that others have sent us
      //   for each forward:
      //   - match it to the request
      //   - store the forwardId on the request
      //   - set the recovery state as RECEIVED
      //   - store the forward against the feedId

      // validate it contains the right information (contains the correct blob reference)
      // and that the forwarded shard has not been tampered with
      // then we can pursue recovery

      pull(
        scuttle.forwardRequest.pull.fromSelf({ reverse: true, live: false }),
        pull.map((request) => ({
          id: request.key,
          state: REQUESTED,
          sentAt: new Date(get(request, 'value.timestamp')),
          feedId: get(request, 'value.content.secretOwner'),
          to: notMe(get(request, 'value.content.recps'))
        })),
        pull.paramap((request, done) => {
          const feedId = request.feedId
          set(records, [feedId, 'feedId'], feedId)
          set(records, [feedId, 'state'], PENDING)

          pull(
            scuttle.forward.pull.fromOthers({ reverse: true, live: false }),
            pull.filter((fwd) => get(fwd, 'value.content.requestId') === request.id),
            pull.map((fwd) => ({
              id: fwd.key,
              feedId: get(fwd, 'value.author'),
              shard: get(fwd, 'value.content.shard'),
              shareVersion: get(fwd, 'value.content.shareVersion'),
              sentAt: new Date(get(fwd, 'value.timestamp')),
              root: get(fwd, 'value.content.root')
            })),
            pull.collect((err, forwards) => {
              if (!isEmpty(forwards)) {
                const [ forward ] = forwards
                set(request, ['forwardId'], forward.id)
                set(request, ['state'], RECEIVED)
                set(records, [feedId, 'forwards', forward.id], forward)
              }
            })
          )

          set(records, [feedId, 'requests', request.id], request)
          done(null)
        }, 10),
        pull.collect((err) => {
          if (err) return console.error(err)
          // Based off the possibly existing recovery that has already begun
          // attempt to reassemble the secret using the quorum the user remembered
          // else just return null
          var record = records[recovery.feedId]
          if (record) {
            const forwards = transform(record.forwards, (accu, value, key, obj) => accu.push(value), [])
            const requests = transform(record.requests, (accu, value, key, obj) => accu.push(value), [])

            var secret
            if (forwards.length) {
              const { quorum, name } = recovery
              if (quorum && forwards.length >= quorum) {
                secret = secrets.combine(forwards.map(f => f.shard), value.version)
                // validate the secret based on expected values
                set(secret, ['state'], READY)
              } else {
                secret = secrets.combine(forwards.map(f => f.shard), value.version)
                // validate the secret based on expected values
                // handle errors, etc and set the secret state
              }
            }

            record = pickBy(Object.assign(record, { forwards, requests, secret }), identity)
          }
          store.set(record ? record : null)
        })
      )
    }

    function watchForUpdates () {
      pull(
        scuttle.forwardRequest.pull.fromSelf({ old: false, live: true }),
        pull.filter(m => !m.sync),
        pull.drain(updateStore)
      )

      pull(
        scuttle.forward.pull.fromOthers({ old: false, live: true }),
        pull.filter(m => !m.sync),
        pull.drain(updateStore)
      )
    }

    function notMe (recps) {
      return recps.find(recp => recp !== id)
    }
  }
}
