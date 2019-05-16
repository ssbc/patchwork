const path = require('path')
const fs = require('fs')
const compile = require('micro-css')

const vendorPaths = [ require.resolve('flatpickr/dist/flatpickr.css') ]
const vendorCss = vendorPaths.map((vendorPath) => fs.readFileSync(vendorPath, 'utf8'))

const theme = (themeName) => {
  const themePath = path.join(__dirname, themeName)
  const basePath = path.join(__dirname, 'base')
  var dirs = [ basePath, themePath ]

  var mcss = []
  var css = [ ...vendorCss ]

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

  return compile(mcss.join('\n')) + css.join('\n')
}

module.exports = {
  light: theme('light'),
  dark: theme('dark')
}
