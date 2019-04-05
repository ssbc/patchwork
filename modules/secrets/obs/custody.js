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
  'sbot.obs.connection': 'first'
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

    if (!store) {
      store = MutantArray([])
      // updateStore()

      // %%TODO%% replace dummy data with real data
      store.set([
        {
          id: '%g1gbRKarJT4au9De2r4aJ+MghFSAyQzjfVnnxtJNBBw=.sha256',
          feedId: '@NeB4q4Hy9IiMxs5L08oevEhivxW+/aDu/s/0SkNayi0=.ed25519',
          sentAt: '2015-9-19',
          state: RECEIVED,
          requests: [],
          forwards: []
        },
        {
          id: '%A1sldjgf923JT4au9De2r4aJ+MghFSAyQzjfVnnxtJNBBw=.sha256',
          feedId: '@NeB4q4Hy9IiMxs5L08oevEhivxW+/aDu/s/0SkNayi0=.ed25519',
          sentAt: '2017-11-05',
          state: REQUESTED,
          requests: [
            {
              id: '%F1gbRKarJT4au9De2r4aJ+MghFSAyQzjfVnnxtJNBBw=.sha256',
              from: '@2FK8RsIq7VkiU0jXi4CTd3L40xiivb6enRxZgXxT+pU=.ed25519',
              sentAt: '2018-4-12'
            }
          ],
          forwards: []
        },
        {
          id: '%RTgbRKarJT4au9De2r4aJ+MghFSAyQzjfVnnxtJNBBw=.sha256',
          feedId: '@NeB4q4Hy9IiMxs5L08oevEhivxW+/aDu/s/0SkNayi0=.ed25519',
          sentAt: '2017-11-05',
          state: RETURNED,
          requests: [
            {
              id: '%G1GBrkARjt4AU9dE2R4Aj+MghFSAyQzjfVnnxtJNBBw=.sha256',
              from: '@2FK8RsIq7VkiU0jXi4CTd3L40xiivb6enRxZgXxT+pU=.ed25519',
              sentAt: '2018-4-12',
              forwardId: '%g1gbRKarJT4au9De2r4aJ+MghFSAyQzjfVnnxtJNBBw=.sha256'
            }
          ],
          forwards: [
            {
              id: '%g1gbRKarJT4au9De2r4aJ+MghFSAyQzjfVnnxtJNBBw=.sha256',
              to: '@2FK8RsIq7VkiU0jXi4CTd3L40xiivb6enRxZgXxT+pU=.ed25519',
              sentAt: '2018-4-15'
            }
          ]
        }
      ])
    }

    // watchForUpdates()

    return throttle(store, limit)

    function updateStore () {
      const records = {
        // [id]: {
        //   { feedId, forwardRequests, forwards }
        // }
      }

      // Using the new 'forOwnShards' query, we would do something like this:
      // pull(
      //   scuttle.forwardRequest.pull.forOwnShards(),
      //   pull.collect((err, requestMsgs) => {
      //     if (err) return console.error(err)
      //
      //     var requests = requestMsgs.map((request) => ({
      //       id: request.key,
      //       from: get(request, 'value.author'),
      //       sentAt: new Date(get(request, 'value.timestamp')).toLocaleDateString()
      //     }))
      //
      //
      //   })
      // )

      pull(
        scuttle.shard.pull.fromOthers({ reverse: true, live: false }),
        pull.filter(shard => get(shard, 'value.content.attachment.name') === 'gossip.json'),
        pull.paramap((shard, done) => {
          const id = shard.key
          const author = get(shard, 'value.author')

          set(records, [id, 'id'], id)
          set(records, [id, 'feedId'], author)
          set(records, [id, 'sentAt'], new Date(shard.value.timestamp).toLocaleDateString())
          // shard state defaults to RECEIVED
          set(records, [id, 'state'], RECEIVED)

          onceTrue(api.sbot.obs.connection, (server) => {
            pull(
              // If we've got any dark-crystal/forward-request records
              // where the identity being recovered
              // is the same as the author of the shard...
              // We can set the shard state as REQUESTED
              //
              // %%TODO%%: pull all forwards and match them against the relevant request
              // if they do match, we can say that the shard has been returned (at least once)
              // and set the state to RETURNED
              //
              // if there is a request whose 'sentAt' timestamp is _later_ than the forward's timestamp
              // we know that we've got a second _outstanding_ request, and we can
              // reset the shard state to REQUESTED

              forwardRequestsQuery({ feedId: author }),
              pull.collect((err, requestMsgs) => {
                var requests = requestMsgs.map((request) => ({
                  id: request.key,
                  from: get(request, 'value.author'),
                  sentAt: new Date(get(request, 'value.timestamp')).toLocaleDateString()
                }))

                set(records, [id, 'forwardRequests'], requests)
                set(records, [id, 'state'], REQUESTED)

                done(null)
              })
            )

            function forwardRequestsQuery (opts = {}) {
              return server.query.read(Object.assign({}, opts, {
                query: [{
                  $filter: {
                    value: {
                      content: {
                        type: 'dark-crystal/forward-request',
                        identity: opts.feedId
                      }
                    }
                  }
                }]
              }))
            }
          })
        }, 10),
        pull.collect((err) => {
          if (err) return console.error(err)
          var recordsArray = transform(records, (acc, requests, id, shard) => acc.push(shard), [])
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

      // %%TODO%% Open two pull streams that watch for forwards and forward-requests
    }
  }
}
