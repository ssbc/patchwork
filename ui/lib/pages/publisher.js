'use strict'
var h       = require('hyperscript')
var o       = require('observable')
var ref     = require('ssb-ref')
var mime    = require('mime-types')
var pwt     = require('published-working-tree')
var multicb = require('multicb')
var app     = require('../app')
var ui      = require('../ui')
var u       = require('../util')
var modals  = require('../ui/modals')
var com     = require('../com')
var social  = require('../social-graph')

// symbols, used to avoid collisions with filenames
var ISROOT = Symbol('isroot')
var ISOPEN = Symbol('isopen')

module.exports = function () {

  var done = multicb({ pluck: 1 })
  app.ssb.patchwork.getPaths(done())
  app.ssb.patchwork.getSite(app.user.id, done())
  done(function (err, res) {
    if (err)
      return modals.error('Error Loading User Info', err, 'This error occurred while loading the publisher page')

    // markup

    var folderPath = o(res[0].site)
    var publishedTree = res[1] ? toTree(res[1]) : null
    var folderData = o()

    var publishBtn
    var folderInput = h('input.hidden', { type: 'file', webkitdirectory: true, directory: true, onchange: onfolderchange })
    ui.setPage('publisher', h('.layout-onecol',
      h('.layout-main',
        h('h3', h('strong', 'Your Site')),
        h('form',
          h('p', 
            folderInput,
            h('a.btn.btn-3d', { onclick: folderInput.click.bind(folderInput) }, 'Select Folder'),
            ' ',
            h('span.files-view-pathctrl', folderPath),
            publishBtn = o.transform(folderData, function (d) {
              var c = pwt.changes(d)
              if (!c.adds.length && !c.dels.length && !c.mods.length)
                return h('a.pull-right.btn.btn-primary.disabled', 'No Changes')

              var changes = []
              if (c.adds.length) changes.push('+'+c.adds.length)
              if (c.dels.length) changes.push('-'+c.dels.length)
              if (c.mods.length) changes.push('^'+c.mods.length)
              changes = changes.join(' / ')
              return h('a.pull-right.btn.btn-primary', { onclick: onpublish }, 'Publish ('+changes+')')
            })
          ),
          o.transform(folderData, function (fd) {
            if (!fd)
              return
            return h('table.files-view',
              h('tbody', render(-1, fd))
            )
          })
        )
      )
    ))

    function render (depth, item) {
      if (item[pwt.TYPE] == 'file') {
        return h('tr',
          h('td', getchange(item)),
          h('td', h('input', { type: 'checkbox', checked: item[pwt.ACTIVE], onchange: oncheck(item) })),
          h('td', 
            h('a', { style: 'padding-left: '+(+depth*20)+'px' }, com.icon('file'), item[pwt.NAME]), ' ',
            getstate(item)
          ),
          h('td', mime.lookup(item[pwt.NAME])||''),
          h('td', item[pwt.STAT] && u.bytesHuman(item[pwt.STAT].size))
        )
      }

      var rows = []

      if (!item[ISROOT]) {
        var col = h('td.folder',
          { onclick: ontoggle(item) },
          h('span',
            { style: 'padding-left: '+(+depth*20)+'px' },
            com.icon('folder-'+(item[ISOPEN]?'open':'close')), item[pwt.NAME], ' ',
            getstate(item)
          )
        )
        col.setAttribute('colspan', 3)
        rows.push(h('tr',
          h('td', getchange(item)),
          h('td', h('input', { type: 'checkbox', checked: item[pwt.ACTIVE], onchange: oncheck(item) })),
          col
        ))
      }
      
      // render folders, then files
      if (item[ISOPEN]) {
        for (var k in item)
          if (item[k][pwt.TYPE] == 'directory')
            rows.push(render(depth + 1, item[k]))
        for (var k in item)
          if (item[k][pwt.TYPE] == 'file')
            rows.push(render(depth + 1, item[k]))
      }

      return rows
    }

    function setactive (item, v) {
      item[pwt.ACTIVE] = v
      for (var k in item)
        setactive(item[k], v)
    }

    function getstate (item) {
      if (item[pwt.DELETED])
        return h('em.text-muted', 'not on disk')
      if (item[pwt.MODIFIED])
        return h('em.text-muted', 'modified')
      if (item[pwt.PUBLISHED])
        return h('em.text-muted', 'published')
    }

    function getchange (item) {
      return ({ add: 'add', mod: 'update', del: 'remove' })[pwt.change(item)] || ''
    }

    // handlers

    function onfolderchange () {
      folderPath(folderInput.files[0].path)
    }

    folderPath(function (path) {
      if (!path)
        return
      ui.pleaseWait(true, 100)

      // :TEMP HACK: create the directory if it does not exist
      var fs = require('fs')
      if (!fs.existsSync(path))
        fs.mkdirSync(path)

      pwt.loadworking(path, publishedTree, function (err, data) {
        ui.pleaseWait(false)
        data[ISROOT] = true
        data[ISOPEN] = true
        folderData(data)
      })
    })

    function oncheck (item) {
      return function () {
        var newcheck = !item[pwt.ACTIVE]
        if (newcheck && item[pwt.TYPE] == 'directory' && !item[pwt.DELETED]) {
          // read all of the directory first
          ui.pleaseWait(true, 100)
          pwt.readall(item[pwt.PATH], item, next)
        }
        else next()

        function next() {
          ui.pleaseWait(false)
          setactive(item, newcheck)
          folderData(folderData())
        }
      }
    }

    function ontoggle (item) {
      return function () {
        item[ISOPEN] = !item[ISOPEN]
        if (item[pwt.DIRREAD] || item[pwt.DELETED])
          folderData(folderData())
        else {
          pwt.read(item[pwt.PATH], item, true, function () {
            folderData(folderData())
          })
        }
      }
    }

    function onpublish () {
      var m
      var c = pwt.changes(folderData())

      var basepathLen = folderPath().length + 1
      function renderChange (type, label) {
        return function (item) {
          return h(type,
            h('.action', label),
            h('.path', item[pwt.PATH].slice(basepathLen)),
            h('.size', item[pwt.STAT] && u.bytesHuman(item[pwt.STAT].size)),
            h('.type',  item[pwt.STAT] && mime.lookup(item[pwt.NAME])||'')
          )
        }
      }

      function onconfirmpublish () {
        var done = multicb()
        var msg = {
          type: 'site',
          includes: c.adds.concat(c.mods).map(function (item) {
            // create link
            var link = {
              link: null,
              path: item[pwt.PATH].slice(basepathLen),
              mtime: item[pwt.STAT].mtime.getTime(),
              size: item[pwt.STAT].size,
              type: mime.lookup(item[pwt.NAME]) || undefined
            }

            // add blob
            var cb = done()
            app.ssb.patchwork.addFileToBlobs(item[pwt.PATH], function (err, res) {
              if (err) {
                modals.error('Failed to Publish File', err, 'This error occurred while adding files to the blobstore in the publisher interface.')
                cb(err)
              } else {
                link.link = res.hash
                if (res.width && res.height) {
                  link.width  = res.width
                  link.height = res.height
                }
                cb()
              }
            })

            return link
          }),
          excludes: c.dels.map(function (item) {
            return {
              link: item.link,
              path: item[pwt.PATH].slice(basepathLen)            
            }
          })
        }
        m.close()

        ui.pleaseWait(true, 100)
        done(function (err) {
          ui.pleaseWait(false)
          if (err) return

          app.ssb.publish(msg, function (err) {
            if (err)
              return modals.error('Failed to Publish Files', err, 'This error occurred while publishing the `site` message in the publisher interface.')
            ui.refreshPage()
          })
        })
      }

      m = modals.default(h('.modal-form',
        h('h3', 'Review Changes'),
        h('.files-view-changes',
          c.adds.map(renderChange('.add', '+')),
          c.mods.map(renderChange('.mod', '^')),
          c.dels.map(renderChange('.del', '-'))
        ),
        h('a.btn.btn-primary', { onclick: onconfirmpublish }, 'Publish')
      ))
    }
  })
}

function set (obj, path, value) {
  var k
  while (true) {
    k = path.shift()
    if (!path.length)
      break
    if (!obj[k])
      obj[k] = {}
    obj = obj[k]
  }
  obj[k] = value
}
function toTree (site) {
  var tree = {}
  for (var path in site)
    set(tree, path.split('/'), site[path])
  return tree
}
