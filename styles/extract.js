const fs = require('fs')
const { diff } = require('deep-object-diff')

const tok = require('../node_modules/micro-css/lib/tokenizer')
const ttm = require('./serializer')

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

fs.readdir('./light', (err, files) => {
  if (err) throw err

  Object.values(files).forEach((file) => {
    if (file.indexOf('.mcss') === -1) {
      return false
    }
    fs.readFile(`./light/${file}`, 'utf-8', (lightErr, lightFile) => {
      if (lightErr) throw lightErr
      fs.readFile(`./dark/${file}`, 'utf-8', (darkErr, darkFile) => {
        if (darkErr) throw darkErr

        const lightTokens = tok(lightFile)
        const darkTokens = tok(darkFile)

        const base = common(darkTokens, lightTokens)
        const baseResult = ttm(base)

        const darkDiff = ttm(diff(base, darkTokens))
        const lightDiff = ttm(diff(base, lightTokens))

        if (baseResult.length > 2) {
          fs.writeFile(`./base/${file}`, baseResult, (writeBaseErr) => {
            if (writeBaseErr) throw writeBaseErr
          })
        }
        if (lightDiff.length > 2) {
          fs.writeFile(`./diff-light/${file}`, lightDiff, (writeLightErr) => {
            if (writeLightErr) throw writeLightErr
          })
        }
        if (darkDiff.length > 2) {
          fs.writeFile(`./diff-dark/${file}`, darkDiff, (writeDarkErr) => {
            if (writeDarkErr) throw writeDarkErr
          })
        }
      })
    })

    return true
  })
})
