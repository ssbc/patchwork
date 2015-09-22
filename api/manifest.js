module.exports = {
  createEventStream: 'source',
  getPaths: 'async',

  getIndexCounts: 'async',
  createInboxStream: 'source',
  createVoteStream: 'source',
  createMyvoteStream: 'source',
  createFollowStream: 'source',
  createHomeStream: 'source',

  markRead: 'async',
  markUnread: 'async',
  toggleRead: 'async',
  isRead: 'async',

  subscribe: 'async',
  unsubscribe: 'async',
  toggleSubscribed: 'async',
  isSubscribed: 'async',

  addFileToBlobs: 'async',
  saveBlobToFile: 'async',

  useLookupCode: 'source',

  getMyProfile: 'async',
  getProfile: 'async',
  getAllProfiles: 'async',

  getSite: 'async',
  getSiteLink: 'async',

  getNamesById: 'async',
  getName: 'async',
  getIdsByName: 'async',
  getActionItems: 'async'
}