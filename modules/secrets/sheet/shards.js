const nest = require('depnest')
const { h, Struct, computed, resolve, watch } = require('mutant')
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
      isOpen: false
    })

    watch(api.secrets.obs.custody(), (shards) => {
      api.sheet.display((close) => {
        const content = !isEmpty(shards) ?
          h('div', { style: { 'padding': '20px' } }, [
            h('h2', 'Custody'),
            h('Shards', [
              h('section.headers', [
                h('div.createdBy', [ h('span', 'Created By') ]),
                h('div.state', [ h('span', 'Status') ]),
              ]),
              h('section.shards', shards.map((shard) => (
                h('div.shard', [
                  h('div.top', {
                    'ev-click': (e) => {
                      props.shard() && props.shard().id === shard.id
                        ? props.shard.set(null)
                        : props.shard.set(shard)
                    }
                  }, [
                    h('div.createdBy', [
                      api.about.html.image(shard.feedId),
                      api.about.obs.name(shard.feedId)
                    ]),
                    h('div.state', [
                      h('div', { classList: [`-${shard.state}`] })
                    ])
                  ]),
                  computed(props.shard, (selectedShard) => {
                    return selectedShard && selectedShard.id === shard.id && !isEmpty(shard.requests)
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
                              h('div.sentAt', `${shard.sentAt.toLocaleDateString()} ${shard.sentAt.toLocaleTimeString()}`),
                              h('div.actions', [
                                // h('button -cancel', 'Ignore'), // %%TODO%%: save the ignored request so you no longer see it
                                h('button -save', {
                                  'ev-click': (e) => {
                                    props.request() && props.request().id === request.id
                                      ? props.request.set(null)
                                      : props.request.set(request)
                                  }
                                }, 'Select for Approval')
                              ]),
                              computed(props.request, (selectedRequest) => {
                                return selectedRequest && selectedRequest.id === request.id
                                  ? h('div.confirm', [
                                    h('p', 'Before you proceed, ensure that these two identities are in-fact the same person and this has been confirmed out-of-band'),
                                    h('div.identity', [
                                      h('div', withoutCurve(shard.feedId)),
                                      h('label.to', 'Input the last 5 characters of the source identity'),
                                      h('input.to', {
                                        type: 'text',
                                        'ev-input': (e) => {
                                          e.target.value.length > 0
                                            ? state.shard.last5.set(e.target.value)
                                            : state.shard.last5.set(null)
                                        }
                                      }, 'From')
                                    ]),
                                    h('div.identity', [
                                      h('div', withoutCurve(request.from)),
                                      h('label.from', 'Input the last 5 characters of the destination identity'),
                                      h('input.from', {
                                        type: 'text',
                                        'ev-input': (e) => {
                                          e.target.value.length > 0
                                            ? state.request.last5.set(e.target.value)
                                            : state.request.last5.set(null)
                                        }
                                      }, 'To')
                                    ]),
                                    computed([state.request.last5, state.shard.last5], (confirmRequestFeed, confirmShardFeed) => {
                                      return confirmRequestFeed == last5(request.from) && confirmShardFeed == last5(shard.feedId)
                                        ? when(state.publishing,
                                          null,
                                          h('button -save', { 'ev-click': save }, i18n('Confirm'))
                                        )
                                        : null
                                    })
                                  ])
                                  : null
                              })
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

        function save () {
          state.publishing.set(true)
          const { request, shard } = resolve(props)
          const params = {
            root: shard.rootId,
            shard: shard.shard,
            shardId: shard.id,
            requestId: request.id,
            shareVersion: shard.shareVersion,
            recp: request.from
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
