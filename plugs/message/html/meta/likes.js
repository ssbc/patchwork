var nest = require('depnest')
var { h, computed, map, send } = require('mutant')

exports.gives = nest('message.html.meta')
exports.needs = nest({
  'message.obs.likes': 'first',
  'sheet.profiles': 'first',
  'about.obs.name': 'first',
  'intl.sync.i18n': 'first'
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('message.html.meta', function likes (msg) {
    if (msg.key) {
      return computed(api.message.obs.likes(msg.key), likeCount)
    }
  })

  function likeCount (likes) {
    if (likes.length) {
      return [' ', h('a.likes', {
        title: nameList(i18n('Liked by'), likes),
        href: '#',
        'ev-click': send(displayLikes, likes)
      }, [`${likes.length} ${likes.length === 1 ? i18n('like') : i18n('likes')}`])]
    }
  }

  function nameList (prefix, ids) {
    var items = map(ids, api.about.obs.name)
    return computed([prefix, items], (prefix, names) => {
      return (prefix ? (prefix + '\n') : '') + names.map((n) => `- ${n}`).join('\n')
    })
  }

  function displayLikes (likes) {
    api.sheet.profiles(likes, i18n('Liked by'))
  }
}
