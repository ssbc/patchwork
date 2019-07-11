// adapted from https://gist.github.com/gmarcos87/565d57747b30e1755046002137228562

var baseTranslation = 'en'
const genericFile = require('../locales/' + baseTranslation + '.json')
const colors = require('colors')
const Path = require('path')

// Load all translation in locales folder
const translations = {}
require('fs').readdirSync(Path.join(__dirname, '..', 'locales')).forEach((file) => {
  if (file.match(/\.json$/) !== null && baseTranslation + '.json' !== file) {
    const name = file.replace('.json', '')
    translations[name] = require('../locales/' + file)
  }
})

const missing = (master, slave) => {
  const slaveKeys = Object.keys(slave)
  return Object.keys(master).filter(key => slaveKeys.indexOf(key) === -1)
}

console.log(colors.bold.underline('Translations differences'))
console.log('Comparing with', colors.yellow(baseTranslation))

Object.keys(translations).forEach((lang) => {
  const translationsMissing = missing(genericFile, translations[lang])
  const translationsSurplus = missing(translations[lang], genericFile)

  // Print Output
  console.log()
  console.log(colors.bold('./locales/' + lang + '.json'))

  if (translationsMissing.length) {
    console.log(colors.green('+++ missing translations'))
    console.log(
      translationsMissing.map(x => '  ' + JSON.stringify(x) + ': ' + JSON.stringify(genericFile[x])).join(',\n')
    )
  }
  if (translationsSurplus.length) {
    console.log(colors.red('--- surplus translations'))
    translationsSurplus.map(x => console.log(colors.red('  ' + JSON.stringify(x))))
  }
})
