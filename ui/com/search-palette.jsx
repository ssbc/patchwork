'use babel'
import React from 'react'
import ssbref from 'ssb-ref'

export default class SearchPalette extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      query: ''
    }
    this.unlistenBefore = app.history.listenBefore(this.onBeforeNavigation.bind(this))
  }
  componentWillUnmount() {
    this.unlistenBefore()
  }

  onBeforeNavigation() {
    this.setState({ query: '' })
  }

  onChange(e) {
    this.setState({ query: e.target.value })
  }

  onKeyDown(e) {
    if (e.keyCode == 13) { // on enter
      this.onSearch()
    }
  }

  onSearch() {
    var query = this.state.query
    if (query && query.trim()) {
      if (ssbref.isLink(query)) {
        // a link, lookup
        if (ssbref.isFeedId(query)) {
          app.history.pushState(null, '/profile/'+encodeURIComponent(query))
        } else if (ssbref.isMsgId(query)) {
          app.history.pushState(null, '/msg/'+encodeURIComponent(query))
        } else if (ssbref.isBlobId(query)) {
          app.history.pushState(null, '/webview/'+encodeURIComponent(query))            
        }
      } else {
        // text query
        app.history.pushState(null, '/search/'+encodeURIComponent(query))
      }
    }
  }

  render() {
    const hasQuery = !!this.state.query
    return <div className="search">
      <i className="fa fa-search" />
      <input 
        ref="search"
        placeholder="Search for people or content"
        value={this.state.query}
        onChange={this.onChange.bind(this)}
        onKeyDown={this.onKeyDown.bind(this)} />
      { hasQuery ? '' : '' }
    </div>
  }
}