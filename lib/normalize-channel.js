module.exports = function (channel) {
  if (typeof channel === 'string') {
    channel = channel.replace(/\s/g, '')
    if (channel.length > 0 && channel.length < 30) {
      return channel
    }
  }
}
