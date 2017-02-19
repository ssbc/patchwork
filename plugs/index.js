module.exports = {
  plugs: require('bulk-require')(__dirname, ['**/!(index).js'])
}
