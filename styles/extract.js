const fs = require('fs')
const { diff } = require('deep-object-diff')

const tokenize = require('../node_modules/micro-css/lib/tokenizer')
const serialize = require('./serializer')

const isObj = (x) => typeof x === 'object'
const common = (a, b) => {
  var result = {}

  if (([a, b]).every(isObj)) {
    Object.keys(a).forEach((key) => {
      const value = a[key]
      const other = b[key]

      if (isObj(value)) {
        result[key] = common(value, other)
      } else if (value === other) {
        result[key] = value
      }
    })
  }

  return result
}
const enc = 'utf-8'

fs.readdir('./light', (err, files) => {
  if (err) throw err

  Object.values(files).forEach((file) => {
    if (file.indexOf('.mcss') === -1) {
      return false
    }

    fs.readFile(`./light/${file}`, enc, (lightErr, lightFile) => {
      if (lightErr) throw lightErr
      fs.readFile(`./dark/${file}`, enc, (darkErr, darkFile) => {
        if (darkErr) throw darkErr

        const lightTokens = tokenize(lightFile)
        const darkTokens = tokenize(darkFile)
        const base = common(darkTokens, lightTokens)

        const results = {
          'base': serialize(base),
          'diff-light': serialize(diff(base, lightTokens)),
          'diff-dark': serialize(diff(base, darkTokens))
        }

        Object.keys(results).forEach(dir => {
          const path = `./${dir}/${file}`
          const result = results[dir]
          if (result.length > 2) {
            fs.writeFile(path, result, (writeErr) => {
              if (writeErr) throw writeErr
            })
          }
        })
      })
    })

    return true
  })
})
