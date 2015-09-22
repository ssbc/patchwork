'use strict'
var h = require('hyperscript')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')

module.exports = function (opts) {

  // markup

  ui.setPage('drive', h('.layout-onecol',
    h('.layout-main',
      (opts && opts.download) ?
        h('.well.white', { style: 'margin-top: 5px' },
          h('p', h('strong', opts.download)),
          h('a.btn.btn-3d', 'Save to your files as...'), ' ', h('a.btn.btn-3d', 'Download...')) :
        '',
      h('.pull-right',
        h('a.btn.btn-3d', 'Upload File')
      ),
      h('h3', 'Your Drive ', h('small', 'Non-functional Mockup Interface')),
      com.files(app.user.id)
    )
  ))
}
