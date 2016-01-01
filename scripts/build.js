var browserify = require('browserify')
var babelify = require('babelify')
var fs = require('fs')
var path = require('path')

browserify({
    extensions: ['.js', '.jsx'],
  })
  .require(path.basename(process.argv[2]), {
    entry: true,  
    basedir: path.dirname(process.argv[2]),
    debug: false
  })
  .transform(babelify, {presets: ['es2015', 'stage-0', 'react']})
  .bundle()
  .pipe(fs.createWriteStream(process.argv[3]))