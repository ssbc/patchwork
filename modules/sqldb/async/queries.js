var nest = require('depnest')

exports.needs = nest({
  'sqldb.sync.sqldb': 'first'
})

exports.gives = nest({
  'sqldb.async.backlinkReferences': true,
  'sqldb.async.backlinkForks': true
})

exports.create = function (api) {
  return nest({
    'sqldb.async.backlinkReferences': references,
    'sqldb.async.backlinkForks': forks
  })
  function forks (id, lastMessage, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    lastMessage = lastMessage || { timestamp: 0 }
    var latestTimestamp = lastMessage.timestamp
    var params = {
      id,
      latestTimestamp
    }

    return knex.raw(`
      SELECT message.key AS id, author_id.author AS author, message.received_time AS timestamp 
      FROM message, json_each(message.branch)
      JOIN links ON links.link_from=message.key 
      LEFT JOIN author_id ON author_id.id=message.author_id 
      WHERE links.link_to = :id
      AND message.received_time > :latestTimestamp 
      AND NOT message.content_type="about"
      AND NOT message.content_type="vote"
      AND NOT message.content_type="tag"
      AND message.root = :id
      AND NOT (json_each.value IS NOT :id )
    `, params).asCallback(cb)
  }

  function references (id, lastMessage, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    lastMessage = lastMessage || { timestamp: 0 }
    var latestTimestamp = lastMessage.timestamp
    var params = {
      id,
      latestTimestamp
    }

    return knex.raw(`
      SELECT message.key AS id, author_id.author AS author, message.received_time AS timestamp 
      FROM message, json_each(message.branch)
      JOIN links ON links.link_from=message.key 
      LEFT JOIN author_id ON author_id.id=message.author_id 
      WHERE links.link_to = :id
      AND message.received_time > :latestTimestamp 
      AND NOT message.content_type="about"
      AND NOT message.content_type="vote"
      AND NOT message.content_type="tag"
      AND NOT message.root = :id
      AND NOT message.fork = :id
      AND (json_each.value IS NOT :id )
    `, params).asCallback(cb)
  }
}
