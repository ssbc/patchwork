module.exports = {
  createEventStream: 'source',

  getIndexCounts: 'async',
  createInboxStream: 'source',
  createVoteStream: 'source',
  createMyvoteStream: 'source',
  createFollowStream: 'source',

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

  getNamesById: 'async',
  getName: 'async',
  getIdsByName: 'async',
  getActionItems: 'async'
}