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
          set(records, [root.key, 'createdAt'], new Date(root.value.timestamp))

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

              var shardMsgs = thread.filter(isShard)

              var shards = shardMsgs.map(shard => ({
                id: shard.key,
                feedId: notMe(get(shard, 'value.content.recps')),
                sentAt: get(shard, 'value.timestamp')
              }))

              set(records, [root.key, 'recipients'], shards.map(s => s.feedId))

              done(null)
            })
          )
        }, 10),
        pull.collect((err, secrets) => {
          if (err) throw err
          var recordsArray = transform(records, (acc, value, key, obj) => {
            if (obj[key].ritualId) acc.push({ id: key, ...obj[key]  })
          }, [])
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
