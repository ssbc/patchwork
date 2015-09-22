var h = require('hyperscript')
var com = require('./index')

module.exports = function (id, opts) {

  // markup

  var oldname = com.userName(id)
  var nameinput = h('input.form-control', { value: oldname })
  var form = h('.rename-form',
    h('h3', 'Rename "', oldname, '"'),
    h('p.text-muted', h('small', 'You can rename anybody! Other people can see the name you choose, but it will only affect you.')),
    h('form.form-inline', { onsubmit: function (e) { e.preventDefault(); opts.onsubmit(nameinput.value) } },
      h('p', nameinput, h('button.btn.btn-3d', 'Save'))
    )
  )

  return form
}