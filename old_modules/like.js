var h = require('../lib/h')
var computed = require('@mmckegg/mutant/computed')
var when = require('@mmckegg/mutant/when')
var plugs = require('patchbay/plugs')
var message_link = plugs.first(exports.message_link = [])
var get_id = plugs.first(exports.get_id = [])
var get_likes = plugs.first(exports.get_likes = [])
var publish = plugs.first(exports.sbot_publish = [])
var people_names = plugs.first(exports.people_names = [])

exports.message_content = exports.message_content_mini = function (msg, sbot) {
  if (msg.value.content.type !== 'vote') return
  var link = msg.value.content.vote.link
  return [
    msg.value.content.vote.value > 0 ? 'dug' : 'undug',
    ' ', message_link(link)
  ]
}

exports.message_meta = function (msg, sbot) {
  return computed(get_likes(msg.key), likeCount)
}

exports.message_action = function (msg, sbot) {
  var id = get_id()
  var dug = computed([get_likes(msg.key), id], doesLike)
  dug(() => {})

  if (msg.value.content.type !== 'vote') {
    return h('a.dig', {
      href: '#',
      'ev-click': function () {
        var dig = dug() ? {
          type: 'vote',
          vote: { link: msg.key, value: 0, expression: 'Undig' }
        } : {
          type: 'vote',
          vote: { link: msg.key, value: 1, expression: 'Dig' }
        }
        if (msg.value.content.recps) {
          dig.recps = msg.value.content.recps.map(function (e) {
            return e && typeof e !== 'string' ? e.link : e
          })
          dig.private = true
        }
        publish(dig)
      }
    }, when(dug, 'Undig', 'Dig'))
  }
}

function doesLike (likes, userId) {
  return likes && likes[userId] && likes[userId][0] || false
}

function likeCount (data) {
  var likes = getLikes(data)
  if (likes.length) {
    return [' ', h('span.likes', {
      title: people_names(likes)
    }, ['+', h('strong', `${likes.length}`)])]
  }
}

function getLikes (likes) {
  return Object.keys(likes).reduce((result, id) => {
    if (likes[id][0]) {
      result.push(id)
    }
    return result
  }, [])
}
