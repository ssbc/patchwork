var h = require('hyperscript')
var suggestBox = require('suggest-box')
var multicb = require('multicb')
var schemas = require('ssb-msg-schemas')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var com = require('./index')
var mentionslib = require('../mentions')

module.exports = function (id, opts) {

  // markup

  var name = com.userName(id)
  var textarea = h('textarea.form-control', { placeholder: 'Write your reason for flagging here.', rows: 4 })
  suggestBox(textarea, app.suggestOptions)
  var form = h('.flag-form',
    h('h3', com.icon('flag'), ' Flag "', name, '"'),
    h('p.text-muted', h('small', 'Warn your followers about this user.')),
    h('form', { onsubmit: onsubmit },
      h('.radios',
        opt('old-account', 'Old account'),
        opt('spammer',     'Spammer'),
        opt('abusive',     'Abusive'),
        opt('nsfw',        'NSFW'),
        opt('other',       'Other')
      ),
      h('p', textarea),
      h('p.text-right', h('button.btn.btn-3d', 'Publish'))
    )
  )

  function opt (value, label) {
    return h('.radio',
      h('label',
        h('input', { type: 'radio', name: 'flag-choice', value: value }),
        label
      )
    )
  }

  // handlers

  function onsubmit (e) {
    e.preventDefault()

    // prep text
    ui.pleaseWait(true)
    ui.setStatus('Publishing...')
    var reason = textarea.value
    var flag
    try { flag = form.querySelector(':checked').value } catch (e) {}
    mentionslib.extract(reason, function (err, mentions) {
      if (err) {
        ui.setStatus(null)
        ui.pleaseWait(false)
        if (err.conflict)
          modals.error('Error While Publishing', 'You follow multiple people with the name "'+err.name+'." Go to the homepage to resolve this before publishing.')
        else
          modals.error('Error While Publishing', err, 'This error occurred while trying to extract the mentions from the text of a flag post.')
        return
      }

      // publish
      var done = multicb({ pluck: 1 })
      app.ssb.publish(schemas.block(id), done())
      app.ssb.publish(schemas.flag(id, flag||'other'), done())
      done(function (err, msgs) {
        if (err) {
          ui.setStatus(null)
          ui.pleaseWait(false)
          return modals.error('Error While Publishing', err, 'This error occurred while trying to publish the block and flag messages.')
        }

        if (!reason) {
          ui.setStatus(null)
          ui.pleaseWait(false)
          return opts.onsubmit()
        }

        app.ssb.publish(schemas.post(reason, msgs[1].key, msgs[1].key, (mentions.length) ? mentions : null), function (err) {
          if (err) modals.error('Error While Publishing', err, 'This error occured while trying to publish the reason-post of a new flag.')
          else opts.onsubmit()
        })
      })
    })
  }

  return form
}