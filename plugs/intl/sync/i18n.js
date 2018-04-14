const nest = require('depnest')
var { watch } = require('mutant')
var appRoot = require('app-root-path')
var i18nL = require('i18n')
var electron = require('electron')

exports.gives = nest('intl.sync', [
  'locale',
  'locales',
  'localeNames',
  'i18n',
  'i18n_n',
  'time',
  'startsWith'
])

exports.needs = nest({
  'intl.sync.locale': 'first',
  'intl.sync.locales': 'reduce',
  'settings.obs.get': 'first',
  'settings.sync.set': 'first'
})

exports.create = (api) => {
  let _locale

  // TODO: this should probably follow the selected language
  var collator = new Intl.Collator('default', {sensitivity: 'base', usage: 'search'})

  return nest('intl.sync', {
    locale,
    locales,
    startsWith,
    localeNames,
    i18n,
    i18n_n: i18nN,
    time
  })

  function startsWith (text, startsWith) {
    return collator.compare(text.slice(0, startsWith.length), startsWith) === 0
  }

  // Get locale value in setting
  function locale () {
    return api.settings.obs.get('patchwork.lang')
  }

  // Get all locales loaded in i18nL
  function locales (sofar = {}) {
    return i18nL.getLocales()
  }

  function localeNames () {
    var names = i18nL.__l('$name')
    return locales().reduce((result, item, i) => {
      result[item] = names[i]
      return result
    }, {})
  }

  // Get translation
  function i18n (value, ...opts) {
    _init()
    return i18nL.__(value, ...opts)
  }

  // Get translation
  function i18nN (value, ...opts) {
    _init()
    return i18nL.__n(value, ...opts)
  }

  function time (date) {
    return date
      .replace(/from now/, i18n('from now'))
      .replace(/ago/, i18n('ago'))
      .replace(/years/, i18n('years'))
      .replace(/months/, i18n('months'))
      .replace(/weeks/, i18n('weeks'))
      .replace(/days/, i18n('days'))
      .replace(/hours/, i18n('hours'))
      .replace(/minutes/, i18n('minutes'))
      .replace(/seconds/, i18n('seconds'))
      .replace(/year/, i18n('year'))
      .replace(/month/, i18n('month'))
      .replace(/week/, i18n('week'))
      .replace(/day/, i18n('day'))
      .replace(/hour/, i18n('hour'))
      .replace(/minute/, i18n('minute'))
      .replace(/second/, i18n('second'))
  }

  // Init an subscribe to settings changes.
  function _init () {
    if (_locale) return
    // TODO: Depject this!
    i18nL.configure({
      directory: appRoot + '/locales',
      defaultLocale: 'en'
    })

    watch(api.settings.obs.get('patchwork.lang'), currentLocale => {
      currentLocale = currentLocale || navigator.language
      var locales = i18nL.getLocales()

      // Try BCP47 codes, otherwise load family language if exist
      if (locales.indexOf(currentLocale) !== -1) {
        i18nL.setLocale(currentLocale)
      } else {
        i18nL.setLocale(getSimilar(locales, currentLocale))
      }

      // Only refresh if the language has already been selected once.
      // This will prevent the update loop
      if (_locale) {
        electron.remote.getCurrentWebContents().reloadIgnoringCache()
      }
    })

    _locale = true
  }
}

// For now get only global languages
function getSubLocal (loc) {
  return typeof loc === 'string' && loc.split('-')[0]
}

function getSimilar (locales, option) {
  var reindexed = {}
  locales.forEach(function (local) {
    (reindexed[getSubLocal(local)])
      ? reindexed[getSubLocal(local)].concat(local)
      : reindexed[getSubLocal(local)] = [local]
  }, this)
  if (reindexed[getSubLocal(option)]) {
    return reindexed[getSubLocal(option)][0]
  }
  return option
}
