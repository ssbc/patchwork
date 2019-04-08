const nest = require('depnest')
const { h, Struct, resolve, Array: MutantArray, computed, when, map } = require('mutant')
const { isEmpty } = require('lodash')

exports.gives = nest('secrets.sheet.shards')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first',
  'sheet.display': 'first',
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'secrets.obs.custody': 'first',
  'emoji.sync.url': 'first',
})

exports.create = (api) => {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n

  return nest('secrets.sheet.shards', function () {
    const shards = api.secrets.obs.custody()

    api.sheet.display((close) => {
      const state = Struct({
        selected: null
      })

      const content = h('div', { style: { 'padding': '20px' } }, [
        h('h2', 'Custody'),
        h('Shards', [
          h('section.headers', [
            h('div.createdBy', [ h('span', 'Created By') ]),
            h('div.state', [ h('span', 'Status') ]),
          ]),
          h('section.shards', map(shards, (shard) => (
            h('div.shard', [
              h('div.top', {
                'ev-click': (e) => state.selected() === shard.id ? state.selected.set(null) : state.selected.set(shard.id)
              }, [
                h('div.createdBy', [
                  api.about.html.image(shard.feedId),
                  api.about.obs.name(shard.feedId)
                ]),
                h('div.state', [
                  h('div', { classList: [`-${shard.state}`] })
                ])
              ]),
              computed(state.selected, (shardId) => {
                return shardId === shard.id && !isEmpty(shard.requests)
                  ? h('div.bottom', [
                    h('div.requests', [
                      h('h3', 'Requests'),
                      h('div.request-headers', [
                        h('div.createdBy', 'Created By'),
                        h('div.sentAt', 'Sent At'),
                        h('div.actions', 'Actions')
                      ]),
                      shard.requests.map((request) => (
                        h('div.request', [
                          h('div.createdBy', [
                            api.about.html.image(request.from),
                            api.about.obs.name(request.from)
                          ]),
                          h('div.sentAt', shard.sentAt),
                          h('div.actions', [
                            h('button -cancel', 'Ignore'),
                            h('button -save', {
                              'ev-click': (e) => {} // force the user to enter the last 5 digits of each identity
                            }, 'Approve')
                          ])
                        ])
                      ))
                    ])
                  ])
                  : null
              })
            ])
          )))
        ])
      ])

      const footer = [
        h('div.state', [
          h('div', { classList: [`-received`] }),
          h('span', 'Received')
        ]),
        h('div.state', [
          h('div', { classList: [`-requested`] }),
          h('span', 'Requested')
        ]),
        h('div.state', [
          h('div', { classList: [`-returned`] }),
          h('span', 'Returned')
        ]),
        h('button -cancel', { 'ev-click': close }, i18n('Cancel'))
      ]

      return {
        content,
        footer,
        classList: ['-private']
      }
    })
  })
}
