const nest = require('depnest')
const DarkCrystal = require('scuttle-dark-crystal')

const { h, Struct, resolve, Array: MutantArray, computed, when, map } = require('mutant')
const { isFeed } = require('ssb-ref')

const {
  isUndefined,
  isNull,
  isEmpty
} = require('lodash')

exports.gives = nest('secrets.sheet.recover')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first',
  'sheet.display': 'first',
  'keys.sync.load': 'first',
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'secrets.html.custodians': 'first',
  'secrets.obs.recovery': 'first',
  'emoji.sync.url': 'first',
  'sbot.obs.connection': 'first',
  'config.sync.load': 'first'
})

exports.create = (api) => {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n

  const scuttle = DarkCrystal(api.sbot.obs.connection)

  return nest('secrets.sheet.recover', function () {
    const props = Struct({
      identity: MutantArray([]),
      quorum: null,
      recps: MutantArray([]),
    })

    const state = Struct({
      canSubmit: false,
      publishng: false
    })

    api.sheet.display((close) => {
      const recovery = api.secrets.obs.recovery()

      const content = computed(recovery, (recovery) => {
        if (isUndefined(recovery) || isNull(recovery)) return h('div', { style: { 'padding': '20px' } }, [ h('p', 'Loading...') ])
        else if (isEmpty(recovery)) {
          const slider = h('input', {
            'required': true,
            'disabled': state.publishing,
            'ev-input': (e) => (e.target.value / 100) >= 2 ? props.quorum.set(Math.round(e.target.value / 100)) : null,
            'title': 'Can you remember the quorum?',
            'type': 'range',
            'min': 2,
            'max': computed(props.recps, (recps) => recps.length >= 7 ? (7 * 100) : recps.length * 100),
            'attributes': {
              value: computed(props.quorum, quorum => quorum > 2 ? quorum * 100 : 2 * 100)
            }
          })

          return h('div', { style: { 'padding': '20px' } }, [
            h('h2', 'Recovery'),
            h('SecretNew', [
              h('div.left', [
                h('section.identity', [
                  h('p', 'Choose your old identity'),
                  api.secrets.html.custodians(props.identity, { maxRecps: 1, disabled: state.publishing })
                ]),
                h('section.custodians', [
                  h('p', 'Select your custodians'),
                  api.secrets.html.custodians(props.recps, { disabled: state.publishing }, () => {
                    var quorum = resolve(props.quorum)
                    var recpsCount = props.recps.getLength()
                    if (quorum > recpsCount) {
                      if (quorum > 2) props.quorum.set(recpsCount)
                      else {
                        props.quorum.set(null)
                        slider.value = '0'
                      }
                    }
                  })
                ]),
                h('section.quroum', [
                  h('section', [
                    h('p', 'Can you remember the quorum?'),
                    slider,
                    h('button -cancel', {
                      'disabled': state.publishing,
                      'ev-click': (e) => { props.quorum.set(null); slider.value = '0' }
                    }, i18n('Clear'))
                  ])
                ])
              ]),
              h('div.right', [
                h('section.identity', map((props.identity), (recp) => (
                  h('div.recp', [
                    api.about.html.image(recp.link),
                    api.about.obs.name(recp.link)
                  ])
                ))),
                h('section.recps', map((props.recps), (recp) => (
                  h('div.recp', [
                    api.about.html.image(recp.link),
                    api.about.obs.name(recp.link)
                  ])
                ))),
                h('section.quorum', [
                  computed(props.quorum, (quorum) => ([
                    quorum
                  ]))
                ])
              ])
            ])
          ])
        }
        else return h('div', { style: { 'padding': '20px' } }, [
          h('h2', 'Recovery'),
          h('SecretNew', [
            h('div.left', [
              'do some funky rendering'
            ]),
            h('div.right', [
              'do some funky rendering'
            ])
          ])
        ])
      })

      const footer = computed(recovery, (recovery) => {
        if (isUndefined(recovery) || isNull(recovery)) return h('div', [ h('button -cancel', { 'ev-click': close }, i18n('Cancel')) ])
        else if (isEmpty(recovery)) return h('div', [
          h('img', { src: api.emoji.sync.url('closed_lock_with_key') }),
          plural('Each selected custodian will receive a private message requesting your shard. They will be asked to confirm your identity out-of-band.'),

          computed([props.recps, props.identity], (recps, identity) => {
            const feedId = identity[0] && identity[0].link
            recps.length >= 2 && feedId && isFeed(feedId) ? state.canSubmit.set(true) : state.canSubmit.set(false)
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
        ])
        else return h('div', [
          h('img', { src: api.emoji.sync.url('closed_lock_with_key') }),
          h('button -cancel', { 'ev-click': close }, i18n('Cancel'))
        ])
      })

      return { content, footer, classList: ['-private'] }

      function save () {
        var params = resolve(props)
        // make sure to remove quorum from props, we don't want to publish that in the forward request,
        // we do want to store it locally and use it to inform the in progress recovery view
        delete params.quorum
        console.log(params)
      }
    })
  })
}
