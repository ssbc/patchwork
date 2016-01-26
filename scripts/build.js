var browserifyInc = require('browserify-incremental')
var babelify = require('babelify')
var fs = require('fs')
var path = require('path')

browserifyInc({
    extensions: ['.js', '.jsx'],
    cacheFile: './browserify-cache.json'
  })
  .require(path.basename(process.argv[2]), {
    entry: true,  
    basedir: path.dirname(process.argv[2]),
    debug: false
  })
  .transform(babelify, {presets: absPathPresets(['es2015', 'stage-0', 'react'])})
  .bundle()
  .pipe(fs.createWriteStream(process.argv[3]))

// babel has trouble finding the presets when symlinked node_modules are used
// giving absolute paths to the modules solves that
function absPathPresets (arr) {
  return arr.map(function (name) {
    return path.join(__dirname, '../node_modules/', 'babel-preset-'+name)
  })
}