const nest = require('depnest')
const pull = require('pull-stream')
const pullParamap = require('pull-paramap')

const DarkCrystal = require('scuttle-dark-crystal')
const secrets = require('dark-crystal-secrets')
// const isForwardRequest = require('scuttle-dark-crystal/isForwardRequest')
// const isForward = require('scuttle-dark-crystal/isForward')

const { h, Value } = require('mutant')

pull.paramap = pullParamap

const REQUESTED = 'requested'
const RECEIVED = 'received'
const READY = 'ready'

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
    const id = api.keys.sync.id()

    if (!store) {
      store = Value()
      updateStore()
    }

    watchForUpdates()

    return store

    function updateStore () {
      var records = {
        // [feedId]: {
        //   feedId: feedId,
        //   forwards: {
        //     [msgId]: { // should this be the feedId of the forward's author?
        //       id: msgId,
        //       shard: string,
        //       shareVersion: string,
        //       sentAt: datetime,
        //       root: msgId,
        //       attachment: { name: string, blobId: blobId }
        //     }
        //   },
        //   requests: {
        //     [msgId]: { // should this be the feedId of the requests's author?
        //       id: msgId,
        //       sentAt: datetime,
        //       to: feedId,
        //       forwardId: msgId
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
          for: get(requestMsg, 'value.content.secretOwner'),
          to: notMe(get(requestMsg, 'value.content.recps'))
        })),
        pull.paramap((request, done) => {
          set(records, [feedId, 'feedId'], request.for)
          set(records, [feedId, 'state'], request.state)

          pull(
            scuttle.forward.pull.fromOthers({ reverse: true, live: false }),
            pull.filter((fwd) => get(fwd, 'value.content.branch')[0] === request.id),
            pull.map((fwd) => ({
              id: fwd.key,
              from: get(fwd, 'value.author'),
              shard: get(fwd, 'value.content.shard'),
              shareVersion: get(fwd, 'value.content.shareVersion'),
              sentAt: new Date(get(fwd, 'value.timestamp')),
              root: get(fwd, 'value.content.root')
            })),
            pull.collect((err, [forward]) => {
              set(request, ['forwardId'], forward.id)
              set(request, ['state'], RECEIVED)
              set(records, [feedId, 'forwards', forward.id], forward)
            })
          )

          set(records, [feedId, 'requests', request.id], request)
          done(null)
        }, 10),
        pull.collect((err) => {
          if (err) return console.error(err)
          var recordsArray = transform(records, (acc, secret, feedId, obj) => {
            const forwards = transform(forwards, (accu, value, key, obj) => accu.push(value), [])
            const requests = transform(requests, (accu, value, key, obj) => accu.push(value), [])

            var secret
            if (forwards.length) {
              const recovery = fs.readFileSync(join(config.path, 'recovery.json'), 'utf8')
              const { quorum } = recovery[feedId]
              if ((quorum && forwards.length >= quorum)) {
                secret = secrets.combine(forwards.map(f => f.shard), value.version)
                // validate the secret based on expected values
                set(secret, ['state'], READY)
              } else {
                secret = secrets.combine(forwards.map(f => f.shard), value.version)
                // validate the secret based on expected values
                // handle errors, etc and set the secret state
              }
            }

            acc.push({
              state: secret.state,
              secret,
              forwards,
              requests
            })
          })
          store.set(recordsArray)
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
