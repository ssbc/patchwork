exports.needs = {
  about: {
    name: 'first',
    link: 'first'
  }
}

exports.gives = {
  person: true
}

exports.create = function (api) {
  return {
    person (id) {
      return api.about.link(id, api.about.name(id), '')
    }
  }
}
