var h = require('hyperscript')
var clipboard = require('clipboard')
var com = require('./index')

module.exports = function (opts) {

  // markup

  var processingInfoText = h('p')
  var processingInfo = h('.processing-info', h('.spinner', h('.cube1'), h('.cube2')), processingInfoText)
  var errorText = h('span', 'Something went wrong!')
  var error = h('.error.text-danger', com.icon('exclamation-sign'), ' ', errorText)
  var useBtn = h('button.btn.btn-3d', 'Find')
  var codeinput = h('input.form-control', { placeholder: 'Enter your friend\'s lookup code here' })
  var form = h('.lookup-form',
    h('h3', 'Find a Friend'),
    h('form.form-inline', { onsubmit: function (e) { e.preventDefault(); if (codeinput.value) { opts.onsubmit(codeinput.value) } } },
      h('p', codeinput, useBtn)),
    processingInfo,
    error,
    h('hr'),
    h('p', h('strong', 'Lookup codes help you find users around the Internet.')),
    h('.code',
      h('p',
        'Your Lookup Code ',
        h('a.btn.btn-3d.btn-xs.pull-right', { href: '#', onclick: oncopy }, com.icon('copy'), ' Copy to clipboard')
      ),
      h('p', h('input.form-control', { placeholder: 'Building...' }))
    ),
    h('.text-muted', 'Send this to your friends, so they can find you.')
  )

  // handlers

  function oncopy (e) {
    e.preventDefault()
    var btn = e.target
    if (btn.tagName == 'SPAN')
      btn = e.path[1]
    clipboard.writeText(form.querySelector('.code input').value)
    btn.innerText = 'Copied!'
  }

  // api

  form.disable = function () {
    useBtn.setAttribute('disabled', true)
    codeinput.setAttribute('disabled', true)
  }

  form.enable = function () {
    useBtn.removeAttribute('disabled')
    codeinput.removeAttribute('disabled')
  }

  form.setYourLookupCode = function (code) {
    form.querySelector('.code input').value = code
  }

  form.setProcessingText = function (text) {
    error.style.display = 'none'
    processingInfoText.innerHTML = text
    processingInfo.style.display = 'block'
  }

  form.setErrorText = function (text) {
    processingInfo.style.display = 'none'
    errorText.innerHTML = text
    error.style.display = 'block'
  }

  return form
}