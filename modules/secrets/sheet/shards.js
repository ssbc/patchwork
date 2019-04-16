const nest = require('depnest')
const { h, Struct, computed, resolve, watch, when } = require('mutant')
const { isEmpty } = require('lodash')
const DarkCrystal = require('scuttle-dark-crystal')

exports.gives = nest('secrets.sheet.shards')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first',
  'sheet.display': 'first',
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'secrets.obs.custody': 'first',
  'emoji.sync.url': 'first',
  'sbot.obs.connection': 'first'
})

exports.create = (api) => {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n

  return nest('secrets.sheet.shards', function () {
    const props = Struct({
      shard: null,
      request: null
    })

    const state = Struct({
      publishing: false,
      shard: Struct({
        last5: null
      }),
      request: Struct({
        last5: null
      }),
    })

    const scuttle = DarkCrystal(api.sbot.obs.connection)

    watch(api.secrets.obs.custody(), (shards) => {
      api.sheet.display((close) => {
        const content = !isEmpty(shards) ?
          h('div', { style: { 'padding': '20px' } }, [
            h('Shards', [
              h('div.header', [
                h('div.left', [
                  h('h2', 'Shards'),
                ]),
                h('div.right', [
                  h('div.state', [
                    h('div', { classList: [`-received`] }, 'Received'),
                  ]),
                  h('div.state', [
                    h('div', { classList: [`-requested`] }, 'Requested'),
                  ]),
                  h('div.state', [
                    h('div', { classList: [`-returned`] }, 'Returned'),
                  ])
                ])
              ]),
              h('section.headers', [
                h('div.createdBy', [ h('span', 'Created By') ]),
                h('div.sentAt', [ h('span', 'Sent At' ) ]),
                h('div.state', [ h('span', 'Status') ]),
                h('div.actions', [ h('span', 'Actions') ])
              ]),
              h('section.shards', shards.map((shard) => (
                h('div', [
                  h('div.shard', [
                    h('div.createdBy', [
                      api.about.html.image(shard.feedId),
                      api.about.obs.name(shard.feedId)
                    ]),
                    h('div.sentAt', `${shard.sentAt.toLocaleDateString()} ${shard.sentAt.toLocaleTimeString()}`),
                    h('div.state', [
                      h('div', { classList: [`-${shard.state}`] }, capitalise(shard.state))
                    ]),
                    h('div.actions', [
                      h('button -save', {
                        'ev-click': (e) => {
                          props.shard() && props.shard().id === shard.id
                            ? props.shard.set(null)
                            : props.shard.set(shard)
                        }
                      }, computed(props.shard, (selectedShard) => selectedShard && selectedShard.id === shard.id ? 'Minimise' : 'View'))
                    ])
                  ]),
                  computed(props.shard, (selectedShard) => {
                    return selectedShard && selectedShard.id === shard.id && !isEmpty(shard.requests)
                      ? h('div', [
                        h('div.wicket', { 'ev-click': (e) => props.shard.set(null) }, '>'),
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
                                api.about.html.image(request.feedId),
                                api.about.obs.name(request.feedId)
                              ]),
                              h('div.sentAt', `${request.sentAt.toLocaleDateString()} ${request.sentAt.toLocaleTimeString()}`),
                              h('div.actions', [
                                // h('button -cancel', 'Ignore'), // %%TODO%%: save the ignored request so you no longer see it
                                h('button -save', {
                                  'ev-click': (e) => {
                                    props.request() && props.request().id === request.id
                                      ? props.request.set(null)
                                      : props.request.set(request)
                                  }
                                }, 'Select')
                              ]),
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
        : h('div', { style: { 'padding': '20px' } }, [
          h('h2', 'Custody'),
          h('Shards', [
            h('p', 'You do not hold any shards')
          ])
        ])

        const footer = [
          h('img', { src: api.emoji.sync.url('closed_lock_with_key') }),
          computed([props.request, props.shard], (selectedRequest, selectedShard) => {
            return selectedRequest && selectedShard && selectedRequest.shardId === selectedShard.id
              ? h('div.final', [
                h('p', 'Ensure that your two chosen identites are the correct people. We strongly advise you confirm this outside Patchwork.'),
                h('label', 'Secret Holder'),
                h('div.source', [
                  h('div.image', [
                    api.about.html.image(selectedShard.feedId),
                    api.about.obs.name(selectedShard.feedId),
                  ]),
                  h('div.confirm', [
                    h('strong', withoutCurve(selectedShard.feedId)),
                    h('label', 'Input the last 5 characters'),
                    h('input.source', {
                      type: 'text',
                      'ev-input': (e) => {
                        e.target.value.length > 0
                          ? state.shard.last5.set(e.target.value)
                          : state.shard.last5.set(null)
                      }
                    }, 'Source Identity')
                  ])
                ]),
                h('label', 'Requested by'),
                h('div.destination', [
                  h('div.image', [
                    api.about.html.image(selectedRequest.feedId),
                    api.about.obs.name(selectedRequest.feedId),
                  ]),
                  h('div.confirm', [
                    h('strong', withoutCurve(selectedRequest.feedId)),
                    h('label', 'Input the last 5 characters'),
                    h('input.from', {
                      type: 'text',
                      'ev-input': (e) => {
                        e.target.value.length > 0
                          ? state.request.last5.set(e.target.value)
                          : state.request.last5.set(null)
                      }
                    }, 'Destination Identity')
                  ]),
                ]),
              ])
              : h('p', 'Ensure that your two chosen identites are the correct people. We strongly advise you confirm this outside Patchwork.')
          }),
          computed([state.request.last5, state.shard.last5, props.request, props.shard], (confirmRequestFeed, confirmShardFeed, selectedRequest, selectedShard) => {
            return selectedRequest &&
              selectedShard
              ? confirmRequestFeed === last5(selectedRequest.feedId) &&
                confirmShardFeed === last5(selectedShard.feedId)
                ? when(state.publishing,
                    null,
                    [
                      h('button -save', { 'ev-click': save }, i18n('Publish')),
                      h('button -cancel', { 'ev-click': (e) => { props.shard.set(null); props.request.set(null) }}, i18n('Cancel'))
                    ]
                  )
                : h('button -cancel', { 'ev-click': (e) => { props.shard.set(null); props.request.set(null) }}, i18n('Cancel'))
              : h('button -cancel', { 'ev-click': close }, i18n('Cancel'))
          })
        ]

        return {
          content,
          footer,
          classList: ['-private']
        }

        function save () {
          state.publishing.set(true)
          const { request, shard } = resolve(props)
          const params = {
            root: shard.rootId,
            shard: shard.shard,
            shardId: shard.id,
            requestId: request.id,
            shareVersion: shard.shareVersion,
            recp: request.feedId
          }
          scuttle.forward.async.publish(params, (err, forward) => {
            if (err) throw err
            state.publishing.set(false)
          })
        }
      })
    })
  })
}

function last5 (feedId) {
  return feedId.substring(39, 44)
}

function withoutCurve (feedId) {
  return feedId.substring(0, 44)
}

function capitalise (string) {
  return string.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase() })
}
