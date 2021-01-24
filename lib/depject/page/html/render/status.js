const { computed, h } = require('mutant')
const nest = require('depnest')
const renderProgress = require('../../../../progress/html/render')

exports.needs = nest({
  'sbot.pull.stream': 'first',
  'progress.obs': {
    indexes: 'first',
    plugins: 'first',
    replicate: 'first',
    migration: 'first'
  },
  'intl.sync.i18n': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    const indexes = api.progress.obs.indexes()
    const pluginIndexes = api.progress.obs.plugins()
    const indexesJson = computed([indexes, pluginIndexes], (indexes, plugins) => {
      return JSON.stringify({indexes, plugins}, null, 4)
    })

    if (path !== '/status') return
    const i18n = api.intl.sync.i18n

    const prepend = [
      h('PageHeading', [
        h('h1', [
          h('strong', i18n('Status'))
        ])
      ])
    ]

    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        h('section.content', [
          h('h2', i18n('Indexes')),
          h('pre', [indexesJson])
        ]),
      ])
    ])
  })
}