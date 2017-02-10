exports.needs = {
  helpers: {
    timestamp: 'first'
  }
}

exports.gives = {
  message: {
    main_meta: true
  }
}

exports.create = function (api) {
  return {
    message: {
      main_meta (msg) {
        return api.helpers.timestamp(msg)
      }
    }
  }
}
