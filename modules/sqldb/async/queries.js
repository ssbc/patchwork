var nest = require('depnest')

exports.needs = nest({
  'sqldb.sync.sqldb': 'first'
})

exports.gives = nest({
  'sqldb.async.backlinkReferences': true,
  'sqldb.async.backlinkForks': true,
  'sqldb.async.likeCount': true,
  'sqldb.async.doesLike': true
})

exports.create = function (api) {
  return nest({
    'sqldb.async.backlinkReferences': references,
    'sqldb.async.backlinkForks': forks,
    'sqldb.async.likeCount': likeCount,
    'sqldb.async.doesLike': doesLike
  })

  function likeCount (id, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    knex('votes_raw')
      .count('votes_raw.id as count')
      .join('keys', 'keys.id', 'votes_raw.link_to_key_id')
      .where('keys.key', id)
      .asCallback(cb)
  }
  function doesLike (id, lastMessage, cb) {

  }
  function forks (id, lastMessage, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    lastMessage = lastMessage || { timestamp: 0 }
    var latestTimestamp = lastMessage.timestamp
    var params = {
      id,
      latestTimestamp
    }

    return knex.raw(`
      SELECT key AS id, author, received_time AS timestamp
      FROM links 
      JOIN messages ON links.link_from_key = key
      WHERE link_to_key = :id
      AND NOT content_type="about"
      AND NOT content_type="vote"
      AND NOT content_type="tag"
      AND received_time > :latestTimestamp
      AND messages.root_id = :id
    `, params).asCallback(cb)
  }

  function references (id, since, cb) {
    since = since || 0 // since will be null the first time this gets called. So set to zero.
    // var { knex, modifiers, strings } = api.sqldb.sync.sqldb()
    var db = api.sqldb.sync.sqldb()
    var { knex, modifiers, strings } = db
    var { links } = strings
    var { backLinksReferences } = modifiers

    knex
      .select([
        'links.link_from_key as id',
        'author',
        'received_time as timestamp'
      ])
      .from(links)
      .modify(backLinksReferences, id, knex)
      .where('flume_seq', '>', since)
      .asCallback(cb)

    // AND received_time > :latestTimestamp
    // AND NOT fork = :id
    //    return knex.raw(`
    //      SELECT key AS id, author, received_time AS timestamp
    //      FROM links
    //      JOIN messages ON link_from = key
    //      WHERE link_to = :id
    //      AND NOT content_type="about"
    //      AND NOT content_type="vote"
    //      AND NOT content_type="tag"
    //      AND NOT root = :id
    //     `, { latestTimestamp, id }).asCallback(cb)
  }
}
