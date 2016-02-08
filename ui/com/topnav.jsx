'use babel'
import React from 'react'
import classNames from 'classnames'
import app from '../lib/app'
import SearchPalette from './search-palette'

export default class Layout extends React.Component {
  constructor(props) {
    super(props)

    // listen for events that should update our state
    app.on('focus:search', this.focusSearch.bind(this))
  }

  focusSearch() {
     this.refs.search.focus()
  }

  render() {
    return <div className="topnav">
      <div className="flex topnav-bar">
        <div className="flex-fill"><SearchPalette ref="search"/></div>
        <a className="compose-btn"><i className="fa fa-plus" /> New Post</a>
      </div>
      <div className="flex topnav-content">
        <a className="selected">Discussions</a>
        <a>Files</a>
        <a>Links</a>
        <a>Images</a>
        <a>Video</a>
        <a>Music</a>
        <a>Events</a>
      </div>
    </div>
  }
}