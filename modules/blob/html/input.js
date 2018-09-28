var h = require('mutant/h')
var resolve = require('mutant/resolve')
var onceTrue = require('mutant/once-true')
var pull = require('pull-stream')
var mime = require('simple-mime')('application/octect-stream')
var split = require('split-buffer')
var nest = require('depnest')
var Defer = require('pull-defer')
var BoxStream = require('pull-box-stream')
var crypto = require('crypto')
var zeros = Buffer.alloc(24, 0)
var piexif = require('piexifjs')

module.exports = {
  needs: nest({
    'sbot.obs.connection': 'first'
  }),
  gives: nest('blob.html.input'),
  create: function (api) {
    return nest('blob.html.input', function FileInput (onAdded, opts = {}) {
      return h('input', {
        accept: opts.accept,
        type: 'file',
        'ev-change': function (ev) {
          var file = ev.target.files[0]
          if (!file) return

          var mimeType = mime(file.name)
          var fileName = file.name

          getFileData(file, function (fileData) {
            var orientation = 0
            if (mimeType === 'image/jpeg') {
              try {
                orientation = getOrientation(fileData)

                if ((typeof opts.removeExif === 'function' && opts.removeExif()) ||
                  opts.removeExif === true) { fileData = removeExif(fileData, orientation) }
              } catch (ex) {
                console.log('exif exception:', ex)
              }
            }

            // handle exif orientation data and resize
            if (orientation >= 3 || opts.resize) {
              getImage(fileData, (image) => {
                image = rotate(image, orientation)
                if (opts.resize) {
                  image = resize(image, opts.resize.width, opts.resize.height)
                }
                if (image.toBlob) {
                  if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
                    mimeType = 'image/jpeg'
                  }
                  image.toBlob(blob => {
                    next(blob)
                  }, mimeType, 0.85)
                } else {
                  next(dataURItoBlob(fileData))
                }
              })
            } else {
              // don't process
              next(dataURItoBlob(fileData))
            }
          })

          function dataURItoBlob (dataURI) {
            var byteString = window.atob(dataURI.split(',')[1])
            var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
            var ab = new ArrayBuffer(byteString.length)
            var ia = new Uint8Array(ab)
            for (var i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i)
            }
            return new window.Blob([ab], {type: mimeString})
          }

          function next (file) {
            var reader = new global.FileReader()
            reader.onload = function () {
              var stream = pull.values(split(new Buffer(reader.result), 64 * 1024))
              pull(stream, AddBlob({
                connection: api.sbot.obs.connection,
                encrypt: resolve(opts.private)
              }, (err, blob) => {
                if (err) return console.error(err)
                onAdded({
                  link: blob,
                  name: fileName,
                  size: reader.result.length || reader.result.byteLength,
                  type: mimeType
                })

                ev.target.value = ''
              }))
            }
            reader.readAsArrayBuffer(file)
          }
        }
      })
    })
  }
}

function getImage (file, cb) {
  var image = document.createElement('img')
  image.onload = () => cb(image)
  image.src = file
  image.style.display = 'block'
  if (image.complete) cb(image)
}

function resize (image, width, height) {
  var imageHeight = image.height
  var imageWidth = image.width

  var multiplier = (height / image.height)
  if (multiplier * imageWidth < width) {
    multiplier = width / image.width
  }

  var finalWidth = imageWidth * multiplier
  var finalHeight = imageHeight * multiplier

  var offsetX = (finalWidth - width) / 2
  var offsetY = (finalHeight - height) / 2

  var canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  var ctx = canvas.getContext('2d')
  ctx.drawImage(image, -offsetX, -offsetY, finalWidth, finalHeight)
  return canvas
}

function getFileData (file, cb) {
  var reader = new global.FileReader()
  reader.onload = function (e) {
    cb(e.target.result)
  }
  reader.readAsDataURL(file)
}

function removeExif (fileData, orientation) {
  var clean = piexif.remove(fileData)
  if (orientation !== undefined) { // preserve
    var exifData = { '0th': {} }
    exifData['0th'][piexif.ImageIFD.Orientation] = orientation
    var exifStr = piexif.dump(exifData)
    return piexif.insert(exifStr, clean)
  } else {
    return clean
  }
}

function getOrientation (fileData) {
  var exif = piexif.load(fileData)
  return exif['0th'][piexif.ImageIFD.Orientation]
}

function rotate (img, orientation) {
  var canvas = document.createElement('canvas')
  var ctx = canvas.getContext('2d')

  if (orientation === 6 || orientation === 8) {
    canvas.width = img.height
    canvas.height = img.width
    ctx.translate(img.height / 2, img.width / 2)
    if (orientation === 6) {
      ctx.rotate(0.5 * Math.PI)
    } else {
      ctx.rotate(1.5 * Math.PI)
    }
  } else if (orientation === 3) {
    canvas.width = img.width
    canvas.height = img.height
    ctx.translate(img.width / 2, img.height / 2)
    ctx.rotate(1 * Math.PI)
  } else {
    return img
  }

  ctx.drawImage(img, -img.width / 2, -img.height / 2)
  return canvas
}

function AddBlob ({connection, encrypt = false}, cb) {
  var stream = Defer.sink()
  onceTrue(connection, sbot => {
    if (encrypt) {
      // FROM: https://github.com/ssbc/ssb-secret-blob/blob/master/index.js
      // here we need to hash something twice, first, hash the plain text to use as the
      // key. This has the benefit of encrypting deterministically - the same file will
      // have the same hash. This can be used to deduplicate storage, but has privacy
      // implications. I do it here just because it's early days and this makes testing
      // easier.

      stream.resolve(Hash(function (err, buffers, key) {
        if (err) return cb(err)
        pull(
          pull.once(Buffer.concat(buffers)),
          BoxStream.createBoxStream(key, zeros),
          Hash(function (err, buffers, hash) {
            if (err) return cb(err)
            var id = '&' + hash.toString('base64') + '.sha256'
            pull(
              pull.values(buffers),
              sbot.blobs.add(id, function (err) {
                if (err) return cb(err)
                sbot.blobs.push(id, function (err) {
                  if (err) return cb(err)
                  cb(null, id + '?unbox=' + key.toString('base64') + '.boxs')
                })
              })
            )
          })
        )
      }))
    } else {
      stream.resolve(sbot.blobs.add(cb))
    }
  })
  return stream
}

function Hash (cb) {
  var hash = crypto.createHash('sha256')
  var buffers = []
  var hasher = pull.drain(function (data) {
    data = typeof data === 'string' ? new Buffer(data) : data
    buffers.push(data)
    hash.update(data)
  }, function (err) {
    cb(err, buffers, hash.digest())
  })
  return hasher
}
