const nest = require('depnest')
var { watch } = require('mutant')
var appRoot = require('app-root-path');
var i18nL = require("i18n")

exports.gives = nest('intl.sync', [
  'locale',
  'locales',
  'i18n',
  'time',
])

exports.needs = nest({
  'intl.sync.locale':'first',
  'intl.sync.locales':'reduce',
  'settings.obs.get': 'first',
  'settings.sync.set': 'first'
})

exports.create = (api) => {
  let _locale

  const {
    locale: getLocale,
    locales: getLocales,
    i18n: getI18n,
  } = api.intl.sync

  return nest('intl.sync', {
    locale,
    locales,
    i18n,
    time
  })

  //Get locale value in setting
  function locale () {
    return api.settings.obs.get('patchwork.lang')
  }

  //Get all locales loaded in i18nL
  function locales (sofar = {}) {
    return i18nL.getLocales()
  }

  //Get translation  
  function i18n (value) {
    _init()
    return i18nL.__(value)
  }

  function time (date){
    return date
      .replace(/from now/, i18n('form now'))
      .replace(/ago/, i18n('ago'))
      .replace(/years/,i18n('years'))
      .replace(/months/,i18n('months'))
      .replace(/weeks/,i18n('weeks'))
      .replace(/days/,i18n('days'))
      .replace(/hours/,i18n('hours'))
      .replace(/minutes/,i18n('minutes'))
      .replace(/seconds/,i18n('seconds'))
      .replace(/year/,i18n('year'))
      .replace(/month/,i18n('month'))
      .replace(/week/,i18n('week'))
      .replace(/day/,i18n('day'))
      .replace(/hour/,i18n('hour'))
      .replace(/minute/,i18n('minute'))
      .replace(/second/,i18n('second'))
  }

  //Init an subscribe to settings changes.
  function _init() {
    if (_locale) return
    //TODO: Depject this!
    _locale = true;
    i18nL.configure({
        locales:['en','ki','es'],
        directory: appRoot + '/locales'
    });

    watch(api.settings.obs.get('patchwork.lang'), currentLocale => {
        i18nL.setLocale(currentLocale)
    })
  }

}

//For now get only global languages
function getSubLocal(loc) {
    return loc.split('-')[0]
}
