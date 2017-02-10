var h = require('../../lib/h')
var computed = require('mutant/computed')
var when = require('mutant/when')

exports.needs = {
  sbot: {
    get_id: 'first'
  },
  message: {
    link: 'first',
    publish: 'first'
  },
  cache: {
    get_likes: 'first'
  },
  people_names: 'first'
}

exports.gives = {
  message: {
    action: true,
    content: true,
    meta: true
  }
}

exports.create = function (api) {
  return {
    message: {
      content (msg) {
        if (msg.value.content.type !== 'vote') return
        var link = msg.value.content.vote.link
        return [
          msg.value.content.vote.value > 0 ? 'dug' : 'undug',
          ' ', api.message.link(link)
        ]
      },
      meta (msg) {
        return computed(api.cache.get_likes(msg.key), likeCount)
      },
      action (msg) {
        var id = api.sbot.get_id()
        var dug = computed([api.cache.get_likes(msg.key), id], doesLike)
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
              api.message.publish(dig)
            }
          }, when(dug, 'Undig', 'Dig'))
        }
      }
    }
  }

  function likeCount (data) {
    var likes = getLikes(data)
    if (likes.length) {
      return [' ', h('span.likes', {
        title: api.people_names(likes)
      }, ['+', h('strong', `${likes.length}`)])]
    }
  }
}

function doesLike (likes, userId) {
  return likes && likes[userId] && likes[userId][0] || false
}

function getLikes (likes) {
  return Object.keys(likes).reduce((result, id) => {
    if (likes[id][0]) {
      result.push(id)
    }
    return result
  }, [])
}
