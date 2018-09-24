var fs = require('fs')
var path = require('path')
var compile = require('micro-css')
const flatpickr = require.resolve('flatpickr/dist/flatpickr.css')

var basePath = path.join(__dirname, '..', 'base')
var dirs = [
  basePath,
  __dirname
]

var result = []
var additional = [ flatpickr ]

dirs.forEach(dir => {
  fs.readdirSync(dir).forEach(file => {
    if (/\.mcss$/i.test(file)) {
      result.push(fs.readFileSync(path.resolve(dir, file), 'utf8'))
    }
    if (/\.css$/i.test(file)) {
      additional.push(fs.readFileSync(path.resolve(dir, file), 'utf8'))
    }
  })
})

module.exports = compile(result.join('\n')) + additional.join('\n')
