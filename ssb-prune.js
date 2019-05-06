const debug = require('debug')('ssb-prune')
const pull = require('pull-stream')
const drain = require('pull-stream/sinks/drain')
const combine = require('depject')
const patchcore = require('patchcore')
const mutant = require('mutant')

debug.enabled = true

exports.init = (sbot) => {

  // once all of the non-deleted messages are added to the second db, we replace a with b
  const deleteList = []

  const api = combine([patchcore])

  // using [0] to emulate depject's "first"
  const id = api.keys.sync.id[0]()
  const blockedById = api.contact.obs.blocking[0](id)

  // Input: list of IDs
  // Output: function that checks whether message was authored by any ID in list
  const createComparator = (feedList) => (msg) => msg && msg.value && feedList.includes(msg.value.author)

  let isInitialValue = true // HACK: see todo regarding skipping initial value
  let haveBlockList = false

  const manualDeleteList = [
    '@00000000000000000000000000000000000000000000.ed25519'
  ]

  mutant.watch(blockedById, (blockList) => {
    console.log('blocklist', blockList)
    if (isInitialValue) {
      // TODO: How should the initial value be skipped?
      // The docs mention `value((v) => {})` but I'm not sure how to use that.
      isInitialValue = false
      debug('loading block list, this requires sbot running with up-to-date indexes')
      setTimeout(() => {
        if (haveBlockList === false) {
          debug('sorry this is taking so long :/')
        }
      }, 8 * 1000)
    } else {
      // ensure we don't run multiple times simultaneously...
      if (haveBlockList === false) {
        haveBlockList = true
        debug('block list:', blockList)
        const compare = createComparator(blockList.concat(manualDeleteList))
        // For each message, either ignore (delete) or add to new log
        const onEachMessage = item => {
          const msg = item.value

          if (compare(msg)) {
            deleteList.push(item.seq)
          }
        }

        debug('starting...')

        pull(
          // we start a pull stream, ignoring the sequence numbers
          sbot.stream({ seqs: true }),
          // now we add the messages from the first db to the second db
          drain(onEachMessage, (err) => {
            if (err) throw err
            debug('done draining messages')

            const len = deleteList.length

            if (len > 0) {
              debug(`deleting ${deleteList.length} messages...`)
              sbot.del(deleteList, (err) => {
                if (err) throw err
                debug('you may see a ton of flumeview errors below, they\'re harmless')
                debug('your views should start rebuilding immediately')
                debug('if you restart your client (or run `ssb-server start` you shouldn\t get any more errors')
              })
            } else {
              debug('no messages to delete')
            }

            debug('done!')
          })
        )
      }
    }
  })
}

exports.manifest = {}
exports.name = 'ssb-prune'
exports.version = require('./package.json').version
