'use strict'
var h = require('hyperscript')
var o = require('observable')
var mime = require('mime-types')
var com = require('./index')
var modals = require('../ui/modals')

module.exports = function () {

  var images = []

  // markup

  var filesInput = h('input.hidden', { type: 'file', accept: 'image/*', multiple: true, onchange: filesAdded })  
  var imagesListEl = h('.images-form-list', { onclick: onlistclick })
  var form = h('.images-form',
    imagesListEl,
    h('.images-form-ctrls',
      h('a.btn.btn-3d', { onclick: onadd, title: 'Add a new image to the album' }, '+ Add Image'),
      h('a.btn.btn-primary.pull-right.disabled', 'Publish')
    )
  )

  // handlers

  function onadd (e) {
    e.preventDefault()
    filesInput.click()
  }

  function onlistclick (e) {
    if (images.length == 0)
      onadd(e)
  }

  function onremove (hash) {
    return function (e) {
      e.preventDefault()
      images = images.filter(function (img) { return img.link != hash })
      imagesListEl.removeChild(imagesListEl.querySelector('.image[data-hash="'+hash+'"]'))
    }
  }

  function filesAdded (e) {
    // hash the files
    var n = filesInput.files.length
    ui.setStatus('Hashing ('+n+' files left)...')
    for (var i=0; i < n; i++) {
      if (!add(filesInput.files[i])) {
        ui.setStatus(false)
        return 
      }
    }
    filesInput.value = null

    function add (f) {
      if (f.size > 5 * (1024*1024)) {
        var inMB = Math.round(f.size / (1024*1024) * 100) / 100
        modals.error('Error Attaching File', f.name + ' is larger than the 5 megabyte limit (' + inMB + ' MB)')
        return false
      }
      app.ssb.patchwork.addFileToBlobs(f.path, function (err, res) {
        if (--n === 0)
          ui.setStatus(false)
        if (err) {
          modals.error('Error Attaching File', err, 'This error occurred while trying to add a file to the blobstore.')
        } else {
          for (var i=0; i < images.length; i++) {
            if (images[i].link == res.hash)
              return
          }
          images.push({
            link: res.hash,
            name: f.name,
            desc: '',
            size: f.size,
            width: res.width,
            height: res.height,
            type: mime.lookup(f.name) || undefined
          })
          imagesListEl.appendChild(h('.image', { 'data-hash': res.hash },
            h('.image-img', h('img', { src: 'http://localhost:7777/'+res.hash })),
            h('.image-ctrls',
              h('p', 
                f.name,
                h('a.pull-right.text-danger', { href: '#', title: 'Remove this image from the album', onclick: onremove(res.hash) }, com.icon('remove'))
              ),
              h('textarea.form-control', { rows: 2, placeholder: 'Add a caption (optional)' })
            )
          ))
        }
      })
      return true
    }
  }

  return form
}

/*
{
  type: 'image-collection',
  updates: {
    link: MsgRef, // if this is an update, points to the original collection msg
    deleted: Boolean // is the target deleted? defaults to false
  },
  title: String,
  desc: String,
  image: BlobLink, // the cover photo
  includes: [{
    link: BlobRef,
    name: String,
    desc: String,
    size: Number, // in bytes
    width: Number,
    height: Number,
    type: String // mimetype
  }],
  excludes: BlobLinks
}
*/