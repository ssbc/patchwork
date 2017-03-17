var nest = require('depnest')
var { h, computed, map } = require('mutant')
exports.gives = nest('message.html.meta')
exports.needs = nest({
  'message.obs.likes': 'first',
  'about.obs.name': 'first'
})

exports.create = function (api) {
  return nest('message.html.meta', function likes (msg) {
    if (msg.key) {
      return computed(api.message.obs.likes(msg.key), likeCount)
    }
  })

  function likeCount (likes) {
    if (likes.length) {
      return [' ', h('span.likes', {
        title: names(likes)
      }, ['+', h('strong', `${likes.length}`)])]
    }
  }

  function names (ids) {
    var items = map(ids, api.about.obs.name)
    return computed([items], (names) => {
      return 'Liked by\n' + names.map((n) => `- ${n}`).join('\n')
    })
  }
}
