var ui = require('patchbay/ui')
var pull = require('pull-stream')
var Cat = require('pull-cat')
var sort = require('ssb-sort')
var ref = require('ssb-ref')
var h = require('hyperscript')
var u = require('patchbay/util')
var Scroller = require('pull-scroll')


function once (cont) {
  var ended = false
  return function (abort, cb) {
    if(abort) return cb(abort)
    else if (ended) return cb(ended)
    else
      cont(function (err, data) {
        if(err) return cb(ended = err)
        ended = true
        cb(null, data)
      })
  }
}

var plugs = require('patchbay/plugs')

var message_render = plugs.first(exports.message_render = [])
var message_name = plugs.first(exports.message_name = [])
var message_compose = plugs.first(exports.message_compose = [])
var message_unbox = plugs.first(exports.message_unbox = [])

var sbot_get = plugs.first(exports.sbot_get = [])
var sbot_links = plugs.first(exports.sbot_links = [])
var get_id = plugs.first(exports.get_id = [])

function getThread (root, cb) {
  //in this case, it's inconvienent that panel only takes
  //a stream. maybe it would be better to accept an array?

  sbot_get(root, function (err, value) {
    var msg = {key: root, value: value}
//    if(value.content.root) return getThread(value.content.root, cb)

    pull(
      sbot_links({rel: 'root', dest: root, values: true, keys: true}),
      pull.collect(function (err, ary) {
        if(err) return cb(err)
        ary.unshift(msg)
        cb(null, ary)
      })
    )
  })

}

exports.screen_view = function (id) {
  if(ref.isMsg(id)) {
    var meta = {
      type: 'post',
      root: id,
      branch: id //mutated when thread is loaded.
    }

    var previousId = id
    var content = h('div.column.scroller__content')
    var div = h('div.column.scroller',
      {style: {'overflow-y': 'auto'}},
      h('div.scroller__wrapper',
        content,
        message_compose(meta, {shrink: false, placeholder: 'Write a reply'})
      )
    )

    message_name(id, function (err, name) {
      div.title = name
    })

    pull(
      sbot_links({
        rel: 'root', dest: id, keys: true, old: false
      }),
      pull.drain(function (msg) {
        loadThread() //redraw thread
      }, function () {} )
    )


    function loadThread () {
      getThread(id, function (err, thread) {
        //would probably be better keep an id for each message element
        //(i.e. message key) and then update it if necessary.
        //also, it may have moved (say, if you received a missing message)
        content.innerHTML = ''
        //decrypt
        thread = thread.map(function (msg) {
          return 'string' === typeof msg.value.content ? message_unbox(msg) : msg
        })

        if(err) return content.appendChild(h('pre', err.stack))
        sort(thread).map((msg) => {
          var result = message_render(msg, {inContext: true, previousId})
          previousId = msg.key
          return result
        }).filter(Boolean).forEach(function (el) {
          content.appendChild(el)
        })

        var branches = sort.heads(thread)
        meta.branch = branches.length > 1 ? branches : branches[0]
        meta.root = thread[0].value.content.root || thread[0].key
        meta.channel = thread[0].value.content.channel

        var recps = thread[0].value.content.recps
        var private = thread[0].value.private
        if(private) {
          if(recps)
            meta.recps = recps
          else
            meta.recps = [thread[0].value.author, get_id()]
        }
      })
    }

    loadThread()
    return div
  }
}
