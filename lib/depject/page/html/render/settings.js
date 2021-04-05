const { computed, h, map, Value, watch } = require('mutant')
const nest = require('depnest')
const packageInfo = require('../../../../../package.json')
const ExpanderHook = require('../../../../expander-hook')

const themeNames = Object.keys(require('../../../../../styles'))
const electron = require('electron')

exports.needs = nest({
  'app.navigate': 'first',
  'settings.obs.get': 'first',
  'intl.sync.locales': 'first',
  'intl.sync.i18n': 'first',
  'intl.sync.localeNames': 'first'
})

exports.gives = nest('page.html.render')

let availableDictionaries = Value([])

electron.ipcRenderer.on('setAvailableDictionaries', (ev, langs) => {
  availableDictionaries.set(langs)
})

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/settings') return
    const i18n = api.intl.sync.i18n

    const locales = api.intl.sync.locales()
    const localeNameLookup = api.intl.sync.localeNames()
    const fontSizes = ['8px', '10px', '12px', '14px', '16px', '18px', '20px']
    const fontFamilies = [
      'serif',
      'sans-serif',
      'cursive',
      'fantasy',
      'monospace'
    ]

    const theme = api.settings.obs.get('patchwork.theme', 'light')
    const lang = api.settings.obs.get('patchwork.lang', '')
    const spellcheckLangs = api.settings.obs.get('patchwork.spellcheckLangs', ['en-GB'])
    const enableSpellCheck = api.settings.obs.get('patchwork.enableSpellCheck', true)
    const spellcheckParams = computed([spellcheckLangs, enableSpellCheck], (langs, enabled) => ({ langs, enabled }))
    watch(spellcheckParams, (params) => {
      electron.ipcRenderer.invoke('setSpellcheckLangs', params)
    })
    const fontSize = api.settings.obs.get('patchwork.fontSize', '')
    const fontFamily = api.settings.obs.get('patchwork.fontFamily', '')
    const includeParticipating = api.settings.obs.get('patchwork.includeParticipating', false)
    const autoDeleteBlocked = api.settings.obs.get('patchwork.autoDeleteBlocked', false)

    // const filterFollowing = api.settings.obs.get('filters.following')
    // const filterSubscriptions = api.settings.obs.get('filters.subscriptions')
    // const onlySubscribed = api.settings.obs.get('filters.onlySubscribed')
    // const filterChannelViewSubscriptions = api.settings.obs.get('filters.channelView.subscriptions')

    const prepend = [
      h('PageHeading', [
        h('h1', [
          h('strong', i18n('Settings'))
        ])
      ])
    ]

    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        h('section.content', [

          h('section', [
            h('h2', i18n('Theme')),
            h('select', {
              style: { 'font-size': '120%' },
              value: theme,
              'ev-change': (ev) => theme.set(ev.target.value)
            }, [
              themeNames.map(name => h('option', { value: name }, [name]))
            ])
          ]),

          h('section', [
            h('h2', i18n('Interface Language')),
            h('select', {
              style: { 'font-size': '120%' },
              value: lang,
              'ev-change': (ev) => lang.set(ev.target.value)
            }, [
              h('option', { value: '' }, i18n('Default')),
              locales.map(code => h('option', { value: code }, [
                '[', code, '] ', getLocaleName(code)
              ]))
            ])
          ]),

          h('section', [
            h('h2', i18n('Spellchecking')),
            h('div', [
              checkbox(enableSpellCheck, {
                label: i18n('Enable Spellchecking')
              })
            ]),
            h('h3', i18n('Languages to check for (select multiple)')),
            h('select', {
              disabled: computed(enableSpellCheck, (b) => !b),
              multiple: true,
              size: 10,
              style: { 'font-size': '120%' },
              hooks: [SpellcheckChangeHook(spellcheckLangs)]
            }, [
              map(availableDictionaries, (code) => h('option', {
                value: code,
                selected: spellcheckLangs().indexOf(code) !== -1,
              }, [
                '[', code, '] ', getLocaleName(code)
              ]))
            ])
          ]),

          h('section', [
            h('h2', i18n('Font Size')),
            h('select', {
              style: { 'font-size': '120%' },
              value: fontSize,
              'ev-change': (ev) => fontSize.set(ev.target.value)
            }, [
              h('option', { value: '' }, i18n('Default')),
              fontSizes.map(size => h('option', { value: size }, size))
            ])
          ]),

          h('section', [
            h('h2', i18n('Font Family')),
            h('select', {
              style: { 'font-size': '120%' },
              value: fontFamily,
              'ev-change': (ev) => fontFamily.set(ev.target.value)
            }, [
              h('option', { value: '' }, i18n('Default')),
              fontFamilies.map(family => h('option', { value: family,  }, family))
            ])
          ]),
          h('h2', i18n('Notification Options')),

          h('div', [
            checkbox(includeParticipating, {
              label: i18n('Include "Participating" tab in navigation bar')
            })
          ]),

          h('h2', i18n('Blocking')),

          h('div', [
            checkbox(autoDeleteBlocked, {
              label: i18n('Automatically delete messages from blocked authors. This is irreversible and will cause problems with clients that share the database but do not support deleted messages. Enable at your own risk!')
            })
          ])
        ]),

        // h('section', [
        //   h('h2', i18n('Channel Feed Options')),

        //   h('div', [
        //     checkbox(filterChannelViewSubscriptions, {
        //       label: i18n('Hide channel subscription messages')
        //     })
        //   ])
        // ]),

        h('section', [
          h('h2', i18n('Key export')),

          h('p', [
            i18n('Click'), ' ',
            h('a', {
              href: '#',
              'ev-click': function () {
                api.app.navigate('/mnemonic', {})
              }
            }, i18n('here')), ' ',
            i18n('to export your secret as a mnemonic.'),
            ' (', 'English only, sorry.',')',
          ])
        ]),

        h('section', [
          h('h2', i18n('Information')),

          h('p', `${packageInfo.productName} ${packageInfo.version}`)
        ])
      ])
    ])

    function getLocaleName (code) {
      const translated = i18n(code)
      const name = localeNameLookup[code]

      if (name !== translated && code !== translated) {
        return `${name} (${translated})`
      } else {
        return name
      }
    }
  })
}

function checkbox (param, { label }) {
  return h('label', [
    h('input', {
      type: 'checkbox',
      checked: param,
      'ev-change': (ev) => param.set(ev.target.checked)
    }), ' ', label
  ])
}

function SpellcheckChangeHook (spellcheckLangs) {
  return function (element) {
    element.addEventListener('change', (ev) => {
      const newLangs = []
      for (const c of ev.target.children) {
        if (c.selected) {
          newLangs.push(c.value)
        }
      }
      spellcheckLangs.set(newLangs)
    })
  }
}
