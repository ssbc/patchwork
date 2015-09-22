var multicb = require('multicb')
var tape    = require('tape')
var u       = require('./util')

tape('names default to self-assigned', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob', 'charlie'] },
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    sbot.patchwork.getNamesById(function (err, names) {
      if (err) throw err
      t.equal(names[users.alice.id], 'alice')
      t.equal(names[users.bob.id], 'bob')
      t.equal(names[users.charlie.id], 'charlie')

      sbot.patchwork.getIdsByName(function (err, ids) {
        if (err) throw err
        t.equal(ids.alice, users.alice.id)
        t.equal(ids.bob, users.bob.id)
        t.equal(ids.charlie, users.charlie.id)
        t.end()
        sbot.close()
      })
    })
  })
})

tape('the local users name assignments take precedence', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob', 'charlie'] },
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    var done = multicb()
    users.alice.add({ type: 'about', about: users.bob.id, name: 'robert' }, done())
    users.alice.add({ type: 'about', about: users.charlie.id, name: 'chuck' }, done())
    done(function (err) {
      if (err) throw err

      sbot.patchwork.getNamesById(function (err, names) {
        if (err) throw err
        t.equal(names[users.alice.id], 'alice')
        t.equal(names[users.bob.id], 'robert')
        t.equal(names[users.charlie.id], 'chuck')

        sbot.patchwork.getIdsByName(function (err, ids) {
          if (err) throw err
          t.equal(ids.alice, users.alice.id)
          t.equal(ids.robert, users.bob.id)
          t.equal(ids.chuck, users.charlie.id)
          t.end()
          sbot.close()
        })
      })
    })
  })
})

tape('conflicting names between followeds are tracked as action items', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob', 'charlie'] },
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    users.charlie.add({ type: 'about', about: users.charlie.id, name: 'bob' }, function (err) {
      if (err) throw err

      sbot.patchwork.getNamesById(function (err, names) {
        if (err) throw err
        t.equal(names[users.alice.id], 'alice')
        t.equal(names[users.bob.id], 'bob')
        t.equal(names[users.charlie.id], 'bob')

        sbot.patchwork.getIdsByName(function (err, ids) {
          if (err) throw err
          t.equal(ids.alice, users.alice.id)
          t.equal(ids.bob.length, 2)

          sbot.patchwork.getActionItems(function (err, items) {
            if (err) throw err
            t.equal(items.bob.type, 'name-conflict')
            t.equal(items.bob.name, 'bob')
            t.equal(items.bob.ids.length, 2)
            t.end()
            sbot.close()
          })
        })
      })
    })
  })
})

tape('conflicting names are resolved by unfollowing', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob', 'charlie'] },
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    users.charlie.add({ type: 'about', about: users.charlie.id, name: 'bob' }, function (err) {
      if (err) throw err

      users.alice.add({ type: 'contact', contact: users.bob.id, following: false }, function (err) {
        if (err) throw err

        sbot.patchwork.getNamesById(function (err, names) {
          if (err) throw err
          t.equal(names[users.alice.id], 'alice')
          t.equal(names[users.bob.id], 'bob')
          t.equal(names[users.charlie.id], 'bob')

          sbot.patchwork.getIdsByName(function (err, ids) {
            if (err) throw err
            t.equal(ids.alice, users.alice.id)
            t.equal(ids.bob, users.charlie.id)

            sbot.patchwork.getActionItems(function (err, items) {
              if (err) throw err
              t.equal(Object.keys(items).length, 0)
              t.end()
              sbot.close()
            })
          })
        })
      })
    })
  })
})

tape('conflicting names are resolved by one of the users self-assigning a new name', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob', 'charlie'] },
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    users.charlie.add({ type: 'about', about: users.charlie.id, name: 'bob' }, function (err) {
      if (err) throw err

      users.bob.add({ type: 'about', about: users.bob.id, name: 'robert' }, function (err) {
        if (err) throw err

        sbot.patchwork.getNamesById(function (err, names) {
          if (err) throw err
          t.equal(names[users.alice.id], 'alice')
          t.equal(names[users.bob.id], 'robert')
          t.equal(names[users.charlie.id], 'bob')

          sbot.patchwork.getIdsByName(function (err, ids) {
            if (err) throw err
            t.equal(ids.alice, users.alice.id)
            t.equal(ids.robert, users.bob.id)
            t.equal(ids.bob, users.charlie.id)

            sbot.patchwork.getActionItems(function (err, items) {
              if (err) throw err
              t.equal(Object.keys(items).length, 0)
              t.end()
              sbot.close()
            })
          })
        })
      })
    })
  })
})

tape('conflicting names are resolved by the local user assigning a new name', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob', 'charlie'] },
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    users.charlie.add({ type: 'about', about: users.charlie.id, name: 'bob' }, function (err) {
      if (err) throw err

      users.alice.add({ type: 'about', about: users.bob.id, name: 'robert' }, function (err) {
        if (err) throw err

        sbot.patchwork.getNamesById(function (err, names) {
          if (err) throw err
          t.equal(names[users.alice.id], 'alice')
          t.equal(names[users.bob.id], 'robert')
          t.equal(names[users.charlie.id], 'bob')

          sbot.patchwork.getIdsByName(function (err, ids) {
            if (err) throw err
            t.equal(ids.alice, users.alice.id)
            t.equal(ids.robert, users.bob.id)
            t.equal(ids.bob, users.charlie.id)

            sbot.patchwork.getActionItems(function (err, items) {
              if (err) throw err
              t.equal(Object.keys(items).length, 0)
              t.end()
              sbot.close()
            })
          })
        })
      })
    })
  })
})
