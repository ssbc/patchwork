const nest = require('depnest')
const { h, Struct, resolve, Array: MutantArray, computed, when, map } = require('mutant')
const DarkCrystal = require('scuttle-dark-crystal')

exports.gives = nest('secrets.sheet.new')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first',
  'sheet.display': 'first',
  'keys.sync.load': 'first',
  'profile.async.suggest': 'first',
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'secrets.html.suggestCustodians': 'first',
  'emoji.sync.url': 'first',
  'sbot.obs.connection': 'first'
})

exports.create = (api) => {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n

  const scuttle = DarkCrystal(api.sbot.obs.connection)

  return nest('secrets.sheet.new', function (callback) {
    callback = callback || noop

    const props = Struct({
      secretName: 'SSB Identity',
      secret: JSON.stringify(api.keys.sync.load()),
      quorum: 2,
      recps: MutantArray([]),
    })

    const state = Struct({
      publishing: false,
      canSave: computed(props, ({ quorum, recps }) => quorum && recps.length >= quorum)
    })

    api.sheet.display((close) => {
      const content = h('div', { style: { 'padding': '20px' } }, [
        h('h2', 'Back Up'),
        h('SecretNew', [
          h('div.left', [
            h('section.custodians', [
              h('p', 'Choose your custodians'),
              // This needs extracting into an async fn and a html renderer
              api.secrets.html.suggestCustodians(props)
            ]),
            h('section.quroum', [
              h('section', [
                h('p', 'Set a quorum'),
                h('div', [
                  // This currently doesn't change when recps length is reduced...
                  h('span', props.quorum)
                ])
              ]),
              h('section', [
                h('input', {
                  'required': true,
                  'ev-input': (e) => (e.target.value / 100) >= 2 ? props.quorum.set(Math.round(e.target.value / 100)) : null,
                  'title': 'Choose a quorum of custodians required to recover your account',
                  'type': 'range',
                  'min': 2,
                  'max': computed(props.recps, (recps) => recps.length >= 7 ? (7 * 100) : recps.length * 100),
                  'attributes': {
                    value: computed(props.quorum, quorum => quorum > 2 ? quorum * 100 : 2 * 100)
                  }
                })
              ])
            ])
          ]),
          h('div.right', [
            h('section.recps', map(props.recps, (recp) => (
              h('div.recp', [
                api.about.html.image(recp.link),
                api.about.obs.name(recp.link)
              ])
            )))
          ])
        ])
      ])

      const footer = [
        h('img', { src: api.emoji.sync.url('closed_lock_with_key') }),
        plural('The quorum and custodians will only be visible to you. Each selected custodian will receive a message containing a cryptographically split section of your identity.'),

        when(state.canSave,
          [
            h('button -save', { 'ev-click': save, 'disabled': state.publishing }, [
              when(state.publishing, i18n('Publishing...'), i18n('Publish'))
            ]),
            h('button -cancel', { 'disabled': state.publishing, 'ev-click': close }, i18n('Cancel'))
          ],
          h('button -cancel', { 'disabled': state.publishing, 'ev-click': close }, i18n('Cancel'))
        )
      ]

      return { content, footer, classList: ['-private'] }

      function save () {
        let params = resolve(props)

        scuttle.share.async.share(params, (err, secret) => {
          if (err) throw err
          else close()
        })
      }
    })
  })
}

function noop () {}
