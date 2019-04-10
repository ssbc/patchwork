const nest = require('depnest')
const DarkCrystal = require('scuttle-dark-crystal')
const blobFiles = require('ssb-blob-files')
const fs = require('fs')
const { join } = require('path')
const { isUndefined, isNull } = require('lodash')

const {
  h,
  Struct,
  resolve,
  Array: MutantArray,
  computed,
  when,
  map,
  watch
} = require('mutant')

exports.gives = nest('secrets.sheet.backup')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first',
  'sheet.display': 'first',
  'keys.sync.load': 'first',
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'secrets.html.custodians': 'first',
  'secrets.obs.identity': 'first',
  'emoji.sync.url': 'first',
  'sbot.obs.connection': 'first',
  'config.sync.load': 'first'
})

exports.create = (api) => {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n
  const config = api.config.sync.load()

  const scuttle = DarkCrystal(api.sbot.obs.connection)

  return nest('secrets.sheet.backup', function () {
    const props = Struct({
      secretName: 'SSB Identity',
      secret: JSON.stringify(api.keys.sync.load()),
      quorum: 2,
      recps: MutantArray([])
    })

    const state = Struct({
      canSubmit: false,
      publishing: false
    })

    watch(api.secrets.obs.identity(), (backup) => {
      api.sheet.display((close) => {
        const content = isUndefined(backup) || isNull(backup)
          ? h('div', { style: { 'padding': '20px' } }, [
            h('h2', 'Back Up'),
            h('SecretNew', [
              h('div.left', [
                h('section.custodians', [
                  h('p', 'Select your custodians'),
                  api.secrets.html.custodians(props.recps, { 'disabled': state.publishing }, () => {
                    var quorum = resolve(props.quorum)
                    var recpsCount = props.recps.getLength()
                    quorum > recpsCount && quorum > 2 ? props.quorum.set(recpsCount) : null
                  })
                ]),
                h('section.quroum', [
                  h('p', 'Select a quorum'),
                  h('input', {
                    'required': true,
                    'disabled': state.publishing,
                    'ev-input': (e) => (e.target.value / 100) >= 2 ? props.quorum.set(Math.round(e.target.value / 100)) : null,
                    'title': 'Select a quorum of custodians required to recover your account',
                    'type': 'range',
                    'min': 2,
                    'max': computed(props.recps, (recps) => recps.length >= 7 ? (7 * 100) : recps.length * 100),
                    'attributes': {
                      value: computed(props.quorum, quorum => quorum > 2 ? quorum * 100 : 2 * 100)
                    }
                  })
                ]),
              ]),
              h('div.right', [
                h('section.recps', map(props.recps, (recp) => (
                  h('div.recp', [
                    api.about.html.image(recp.link),
                    api.about.obs.name(recp.link)
                  ])
                ))),
                h('section.quorum', [
                  h('div', [ h('span', props.quorum) ])
                ])
              ])
            ])
          ])
          : h('div', { style: { 'padding': '20px' } }, [
            h('h2', 'Back Up'),
            h('SecretNew', [
              h('div.left', [
                h('section.custodians', [
                  h('p', 'Custodians'),
                ]),
                h('section.quroum', [
                  h('p', 'Quorum'),
                ])
              ]),
              h('div.right', [
                h('section.custodians', [
                  backup.recipients.map(recp => (
                    h('div.custodian', [
                      api.about.html.image(recp),
                      api.about.obs.name(recp)
                    ])
                  ))
                ]),
                h('section.quroum', [
                  h('div', [
                    h('span', backup.quorum)
                  ])
                ])
              ])
            ])
          ])

        const footer = isUndefined(backup) || isNull(backup)
          ? [
            h('img', { src: api.emoji.sync.url('closed_lock_with_key') }),
            plural('The quorum and custodians will only be visible to you. Each selected custodian will receive a message containing a cryptographically split section of your identity.'),

            computed([props.quorum, props.recps], (quorum, recps) => {
              quorum <= recps.length ? state.canSubmit.set(true) : state.canSubmit.set(false)
            }),

            when(state.canSubmit,
              [
                h('button -save', { 'ev-click': save, 'disabled': state.publishing }, [
                  when(state.publishing, i18n('Publishing...'), i18n('Publish'))
                ]),
                h('button -cancel', { 'disabled': state.publishing, 'ev-click': close }, i18n('Cancel'))
              ],
              h('button -cancel', { 'disabled': state.publishing, 'ev-click': close }, i18n('Cancel'))
            )
          ]
          : [
            h('img', { src: api.emoji.sync.url('closed_lock_with_key') }),
            h('button -cancel', { 'ev-click': close }, i18n('Cancel'))
          ]

        return { content, footer, classList: ['-private'] }

        function save () {
          var buffer = fs.readFileSync(join(config.path, 'gossip.json'))
          var file = new File(buffer, 'gossip.json', { type: 'application/json' })

          blobFiles([file], api.sbot.obs.connection, { isPrivate: true }, (err, attachment) => {
            if (err) throw err
            var params = Object.assign({}, resolve(props), { attachment })
            params.name = params.secretName
            delete params.secretName

            scuttle.share.async.share(params, (err, secret) => {
              if (err) throw err
              else close()
            })
          })
        }
      })
    })
  })
}
