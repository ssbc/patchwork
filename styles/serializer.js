const hackyColorNormalizer = require('./hacky-color-normalizer')

module.exports = (tokens) => {
  const rulePlugins = [ hackyColorNormalizer ]
  const indentSpaces = 2

  let result = ''
  let indent = 0

  const ignoreList = [
    'objects',
    'flags',
    'pseudos',
    'entities',
    'elements',
    'mixins'
  ]

  const outputList = [
    'extensions',
    'rules'
  ]

  const print = (text) => {
    result += Array(indent + 1).join(' ')
    result += text
    result += '\n'
  }

  const hasOutput = (obj, key) => {
    return Object.keys(obj[key]).some((innerKey) => {
      if (outputList.includes(innerKey)) {
        if (obj[key][innerKey]) {
          const outputArray = Object.keys(obj[key][innerKey])
          if (outputArray.length) {
            return true
          }
        }
      } else {
        if (obj[key][innerKey]) {
          return hasOutput(obj[key], innerKey)
        }
      }
    })
  }

  const handleBlock = (obj, key) => {
    if (hasOutput(obj, key)) {
      if (obj[key].deep) {
        print(`(${key}) {`)
      } else {
        print(`${key} {`)
      }
      indent += indentSpaces
      walk(obj[key])
      indent -= indentSpaces
      print('}')
    }
  }

  const handleRules = (obj, key) => {
    Object.keys(obj[key]).forEach((rule) => {
      let value = obj[key][rule]
      if (value !== undefined) {
        rulePlugins.forEach((plugin) => {
          value = plugin(value)
        })
        print(`${rule}: ${value}`)
      }
    })
  }

  const handleExtensions = (obj, key) => {
    Object.values(obj[key]).forEach((extension) => {
      print(extension)
    })
  }

  const walk = (obj) => {
    Object.keys(obj).forEach((key) => {
      if (obj[key]) {
        if (ignoreList.includes(key)) {
          walk(obj[key])
        } else if (key === 'deep') {
          // The `deep` key is meant to be handled by `handleBlock`, so nothing
          // needs to be done here. We treat `deep` as a dead end.

        } else if (key === 'extensions') {
          handleExtensions(obj, key)
        } else if (key === 'rules') {
          handleRules(obj, key)
        } else {
          handleBlock(obj, key)
        }
      }
    })
  }

  walk(tokens)
  return result
}
