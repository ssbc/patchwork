const nest = require('depnest')
const { h, Struct, resolve, Array: MutantArray, computed, when, map } = require('mutant')

exports.gives = nest('secrets.sheet.new')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'sheet.display': 'first',
  'profile.async.suggest': 'first',
  'about.html.image': 'first',
  'secrets.html.suggestCustodians': 'first'
})

exports.create = (api) => {
  const i18n = api.intl.sync.i18n

  return nest('secrets.sheet.new', function (callback) {
    callback = callback || noop

    const props = Struct({
      secretName: 'SSB Identity',
      secret: null,
      quorum: 2,
      recps: MutantArray([]),
    })

    const state = Struct({
      publishing: false,
    })

    api.sheet.display((close) => {
      const content = h('div', { style: { 'padding': '20px', 'text-align': 'center' } }, [
        h('h2', 'Back Up'),
        h('SecretNew', [
          h('input', {
            'required': true,
            'ev-input': (e) => (e.target.value / 100) >= 2 ? props.quorum.set(Math.round(e.target.value / 100)) : null,
            'title': 'Choose a quorum of custodians required to recover your account',
            'type': 'range',
            'min': 2,
            'max': (7 * 100) || (props.recps.getLength() * 100),
            'attributes': {
              value: computed(props.quorum, quorum => quorum > 2 ? quorum * 100 : 2 * 100)
            }
          }),
          api.secrets.html.suggestCustodians(props),
          h('div.recps', [
            map(props.recps, (recp) => api.about.html.image(recp.link))
          ])
        ])
      ])

      const footer = [
        h('button -save', { 'ev-click': save, 'disabled': state.publishing }, [
          when(state.publishing, i18n('Publishing...'), i18n('Publish'))
        ]),
        h('button -cancel', { 'disabled': state.publishing, 'ev-click': close }, i18n('Cancel'))
      ]

      return { content, footer }

      function save () {
        let params = resolve(props)
        console.log(params)
        close()
      }
    })
  })
}

function noop () {}
