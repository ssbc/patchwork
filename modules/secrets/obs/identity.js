const nest = require('depnest')
const pull = require('pull-stream')
const pullParamap = require('pull-paramap')
const { isFeedId  } = require('ssb-ref')

const { get, set, transform, pickBy, identity, uniq  } = require('lodash')

const DarkCrystal = require('scuttle-dark-crystal')
const isShard = require('scuttle-dark-crystal/isShard')
const isRitual = require('scuttle-dark-crystal/isRitual')
const isRequest = require('scuttle-dark-crystal/isRequest')
const isReply = require('scuttle-dark-crystal/isReply')

const { h, Value } = require('mutant')

pull.paramap = pullParamap

const PENDING = 'pending'
const REQUESTED = 'requested'
const RECEIVED = 'received'

const SSB_IDENTITY = 'SSB Identity'

exports.gives = nest('secrets.obs.identity')

exports.needs = nest({
  'sbot.obs.connection': 'first',
  'keys.sync.id': 'first'
})

exports.create = (api) => {
  return nest('secrets.obs.identity', fetchSecrets)

  var store = null

  function fetchSecrets () {
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
        // [rootId]: {
        //   ritualId: string,
        //   name: string,
        //   quorum: integer,
        //   createdAt: datetime,
        //   recipients: [ feedId: string  ],
        //   shards: [
        //     {
        //       id: string,
        //       feedId: string,
        //       encrypedShard: string,
        //       state: string,
        //       shard: string,
        //       requests: [
        //         { request  },
        //         { request, reply  }
        //       ]
        //     }
        //   ]
        // }
      }

      pull(
        scuttle.root.pull.mine({ live: false, reverse: true  }),
        pull.filter(root => get(root, 'value.content.name') === SSB_IDENTITY),
        pull.paramap((root, done) => {
          set(records, [root.key, 'name'], get(root, 'value.content.name'))
          set(records, [root.key, 'createdAt'], new Date(root.value.timestamp).toLocaleDateString())

          pull(
            scuttle.root.pull.backlinks(root.key, { live: false  }),
            pull.collect((err, thread) => {
              if (err) return done(err)

              var ritual = thread.find(isRitual)

              if (!ritual) return done(null)

              var version = get(ritual, 'value.content.version')
              var quorum = get(ritual,'value.content.quorum')

              set(records, [root.key, 'ritualId'], ritual.key)
              set(records, [root.key, 'quorum'], quorum)

              var requestMsgs = thread.filter(isRequest)
              var replyMsgs = thread.filter(isReply)
              var shardMsgs = thread.filter(isShard)

              var shards = shardMsgs.map(shard => {
                const { recps, shard: encryptedShard  } = get(shard, 'value.content')
                const feedId = notMe(recps)

                let state, returnedShard

                var requests = getDialogue(shard, requestMsgs).map(request => ({
                  id: request.key,
                  createdAt: new Date(request.value.timestamp).toLocaleDateString(),
                  feedId: notMe(get(request, 'value.content.recps')),
                }))

                var replies = getDialogue(shard, replyMsgs).map(reply => ({
                  id: reply.key,
                  createdAt: new Date(reply.value.timestamp).toLocaleDateString(),
                  feedId: notMe(get(reply, 'value.content.recps')),
                  shard: get(reply, 'value.content.body')
                }))

                // only gets the first one per person...
                // if we have more than one, they're sending us multiple shards,
                // some of which could be duds (including the first),
                // %%TODO%%: handle this gracefully...
                var body = uniq(replies.map(r => r.shard))[0]

                return pickBy({
                  id: shard.key,
                  feedId,
                  encryptedShard,
                  body,
                  // state,
                  requests,
                  replies
                }, identity)
              })

              function dialogueKey (msg) {
                var recps = get(msg, 'value.content.recps')
                if (!recps) return null
                return recps.sort().join(':')
              }

              function getDialogue (shard, msgs) {
                return msgs.filter((msg) => dialogueKey(shard) === dialogueKey(msg))
              }

              // Our view demands that recipients knows about if there's been a response (adds a border)
              set(records, [root.key, 'recipients'], shards.map(s => s.feedId))
              set(records, [root.key, 'shards'], shards)

              let shardBodies = shards
                .map(s => s.body)
                .filter(Boolean)

              // if (shardBodies.length >= quorum) {
              //   let secret = secrets.combine(shardBodies, version)
              //   set(records, [root.key, 'secret'], secret)
              // }

              done(null)
            })
          )
        }, 10),
        pull.collect((err, secrets) => {
          if (err) throw err
          var recordsArray = transform(records, (acc, value, key, obj) => {
            if (obj[key]['ritualId']) acc.push({ id: key, ...obj[key]  })
          }, [])
          // We should only have one matching the name SSB Identity.. 
          // but we're not performing any validation in scuttle-dark-crystal to prevent multiple secrets with the same name
          // so this could end up only getting the last
          store.set(recordsArray[recordsArray.length-1])
        })
      )
    }

    function watchForUpdates () {
      pull(
        scuttle.root.pull.mine({ old: false, live: true  }),
        pull.filter(m => !m.sync),
        pull.drain(m => updateStore())
      )
    }

    function notMe (recps) {
      return recps.find(recp => recp !== id)
    }
  }
}
