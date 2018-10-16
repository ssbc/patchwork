var fs = require('fs')
var path = require('path')
var compile = require('micro-css')
var vendorCss = require('../vendor')

var basePath = path.join(__dirname, '..', 'base')
var dirs = [
  basePath,
  __dirname
]

var mcss = []
var css = [
  ...vendorCss
]

dirs.forEach(dir => {
  fs.readdirSync(dir).forEach(file => {
    if (/\.mcss$/i.test(file)) {
      mcss.push(fs.readFileSync(path.resolve(dir, file), 'utf8'))
    }
    if (/\.css$/i.test(file)) {
      css.push(fs.readFileSync(path.resolve(dir, file), 'utf8'))
    }
  })
})

module.exports = compile(mcss.join('\n')) + css.join('\n')
