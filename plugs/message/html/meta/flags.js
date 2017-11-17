var nest = require('depnest')
var { h, computed, map, send } = require('mutant')

exports.gives = nest('message.html.meta')
exports.needs = nest({
  'message.obs.flags': 'first',
  'sheet.profiles': 'first',
  'about.obs.name': 'first',
  'intl.sync.i18n': 'first'
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('message.html.meta', function flags (msg) {
    if (msg.key) {
      return computed(api.message.obs.flags(msg.key), flagCount)
    }
  })

  function flagCount (flags) {
    console.log('flags', flags)
    if (flags.length) {
      return [' ', h('a.flags', {
        title: nameList(i18n('Flagged by'), flags),
        href: '#',
        'ev-click': send(displayFlags, flags)
      }, [`${flags.length} ${flags.length === 1 ? i18n('flag') : i18n('flags')}`])]
    }
  }

  function nameList (prefix, flags) {
    console.log('flags', flags)
    var items = map(flags, flag => {
      console.log('flag', flag)
      //api.about.obs.name)
    })
    return computed([prefix, items], (prefix, names) => {
      return (prefix ? (prefix + '\n') : '') + names.map((n) => `- ${n}`).join('\n')
    })
  }

  function displayFlags (flags) {
    // TODO show flags with reasons
    api.sheet.profiles(flags, i18n('Flagged by'))
  }
}
