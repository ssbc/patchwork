const nest = require('depnest')
const pull = require('pull-stream')
const pullParamap = require('pull-paramap')
const { isFeedId  } = require('ssb-ref')
const { get, set, transform, sortBy  } = require('lodash')

const Scuttle = require('scuttle-dark-crystal')
const isRequest = require('scuttle-dark-crystal/isRequest')
const isReply = require('scuttle-dark-crystal/isReply')

const { h, Array: MutantArray, throttle, onceTrue } = require('mutant')

pull.paramap = pullParamap

const RECEIVED = 'received'
const REQUESTED = 'requested'
const RETURNED = 'returned'

exports.gives = nest('app.actions.shards.fetch')

exports.needs = nest({
  'sbot.obs.connection': 'first'
})

exports.create = (api) => {
  return nest('app.actions.shards.fetch', fetch)

  // store is an observable that returns an array of structure:
  // [
  //   { id: msgId, feedId: feedId, sentAt: timestamp, state: string, requests: [ { id: msgId, from: feedId, sentAt: timestamp } ] },
  //   { id: msgId, feedId: feedId, sentAt: timestamp, state: string, requests: [ { id: msgId, from: feedId, sentAt: timestamp } ] },
  // ]

  var store = null

  function fetch (props = {}) {
    const { limit = 100  } = props

    const scuttle = Scuttle(api.sbot.obs.connection)

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
