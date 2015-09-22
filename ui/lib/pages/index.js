'use strict'
var h = require('hyperscript')
var ui = require('../ui')
var com = require('../com')

function notfound () {
  ui.setPage('notfound', [
    h('img', { src: 'img/lick-the-door.gif', style: 'display: block; margin: 10px auto; border-radius: 3px;' }),
    h('h2.text-center', 'Page Not Found'),
    h('div.text-center', { style: 'margin-top: 20px' },
      'Sorry, that page wasn\'t found. Maybe you typed the name wrong? Or maybe somebody gave you a bad link.'
    )
  ])
}

module.exports = {
  drive:     require('./drive'),
  feed:      require('./feed'),
  friends:   require('./friends'),
  home:      require('./home'),  
  inbox:     require('./inbox'),
  msg:       require('./message'),
  notfound:  notfound,
  profile:   require('./profile'),
  publisher: require('./publisher'),
  search:    require('./search'),
  setup:     require('./setup'),
  stars:     require('./stars'),
  sync:      require('./sync'),
  webview:   require('./webview')
}