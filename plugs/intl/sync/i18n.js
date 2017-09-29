const nest = require('depnest')
var { watch } = require('mutant')
var appRoot = require('app-root-path');
var i18nL = require("i18n")

exports.gives = nest('intl.sync', [
  'locale',
  'locales',
  'i18n',
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
    i18n
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

  //Init an subscribe to settings changes.
  function _init() {
    if (_locale) return
    //TODO: Depject this!
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
