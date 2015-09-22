'ust strict'
var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var com = require('../com')

module.exports = function () {
  var name = app.users.names[app.user.id] || ''
  var profilePic = null
  var is_new = !name

  // markup

  var nameInput = h('input.form-control', { type: 'text', name: 'name', placeholder: 'Nickname', value: name, onkeyup: checkInput })
  var imageUploader = com.imageUploader({ onupload: onImageUpload, existing: com.profilePicUrl(app.user.id) })
  var issue = h('.text-danger.hide')
  var postBtn = h('button.btn.btn-primary', { onclick: post, disabled: is_new }, 'Save')
  ui.setPage('setup', h('.layout-setup',
    h('.layout-setup-left',
      h('h2', (is_new) ? 'New account' : 'Edit Your Profile'),
      h('.panel.panel-default', { style: 'border: 0' },
        h('.panel-body',
          h('.form-group',
            h('label.control-label', 'Your nickname'),
            nameInput
          )
        )
      ),
      h('.panel.panel-default', { style: 'border: 0' },
        h('.panel-body',
          h('label.control-label', 'Your profile pic'),
          imageUploader
        )
      )
    ),
    h('.layout-setup-right', h('.layout-setup-right-inner',
      (is_new) ?
        [
          h('p', 'Welcome to ', h('strong', 'Secure Scuttlebutt!')),
          h('p', 'Fill out your profile and then click ', h('strong', 'Save'), ' to get started.')
        ] :
        h('p', 'Update your profile and then click ', h('strong', 'Save'), ' to publish the changes.'),
      h('.panel.panel-default', { style: 'border: 0; display: inline-block' },
        h('.panel-body', issue, postBtn)),
      (!is_new) ? h('div', { style: 'padding: 0 22px' }, h('a.text-muted', { href: '#', onclick: oncancel }, 'Cancel')) : ''
    ))
  ))

  // handlers

  var badNameCharsRegex = /[^A-z0-9\._-]/
  function checkInput (e) {
    if (!nameInput.value) {
      postBtn.setAttribute('disabled', true)
      postBtn.classList.remove('hide')
      issue.classList.add('hide')
    } else if (badNameCharsRegex.test(nameInput.value)) {
      issue.innerHTML = 'We\'re sorry, your name can only include A-z 0-9 . _ - and cannot have spaces.'
      postBtn.setAttribute('disabled', true)
      postBtn.classList.add('hide')
      issue.classList.remove('hide')
    } else if (nameInput.value.slice(-1) == '.') {
      issue.innerHTML = 'We\'re sorry, your name cannot end with a period.'
      postBtn.setAttribute('disabled', true)
      postBtn.classList.add('hide')
      issue.classList.remove('hide')
    } else {
      postBtn.removeAttribute('disabled')
      postBtn.classList.remove('hide')
      issue.classList.add('hide')
    }
  }

  function post (e) {
    e.preventDefault()
    if (!nameInput.value) 
      return

    // close out image uploader if the user didnt
    imageUploader.forceDone(function () {

      // publish
      ui.pleaseWait(true, 500)
      app.ssb.publish(schemas.about(app.user.id, nameInput.value, profilePic), function (err) {
        ui.pleaseWait(false)
        if (err) modals.error('Error While Publishing', err, 'This error occurred while trying to post a new profile in setup.')
        else window.location = '#/'
      })
    })
  }

  function oncancel (e) {
    e.preventDefault()
    window.location = '#/profile/'+app.user.id
  }

  function onImageUpload (hasher) {
    profilePic = {
      link: '&'+hasher.digest,
      size: hasher.size,
      type: 'image/png',
      width: 275,
      height: 275
    }
  }
}