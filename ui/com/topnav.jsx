'use babel'
import React from 'react'
import classNames from 'classnames'
import app from '../lib/app'
import SearchPalette from './search-palette'
import Composer from './composer'

export default class TopNav extends React.Component {
  constructor(props) {
    super(props)
    this.state = { isComposerOpen: false }

    // listen for events that should update our state
    app.on('focus:search', this.focusSearch.bind(this))
  }

  focusSearch() {
     this.refs.search.focus()
  }

  onClickCompose() {
    clearTimeout(this.expandTimeout)
    if (this.state.isComposerOpen) {
      this.setState({ isComposerOpen: false })
    } else {
      this.setState({ isComposerOpen: true }, () => {
        // focus the textarea
        const cp = this.props.composerProps
        if (cp && (cp.recps || cp.isPublic)) // if public, or recps are provided, focus straight onto the textarea
          this.refs.composer.querySelector('textarea').focus()
        else
          this.refs.composer.querySelector('input[type=text], textarea').focus()

        // after the expand animation, remove the max-height limit so that the preview can expand
        this.expandTimeout =
          setTimeout(() => this.refs.composer.style.maxHeight = '100%', 1e3)
      })
    }
  }

  onSend(msg) {
    this.setState({ isComposerOpen: false })
    if (this.props.onSend)
      this.props.onSend(msg)
  }

  render() {
    const onClickCompose = this.onClickCompose.bind(this)
    if (this.state.isComposerOpen) {
      return <div className="topnav">
        <div ref="composer"><Composer {...this.props.composerProps} cancelBtn onCancel={onClickCompose} onSend={this.onSend.bind(this)} /></div>
      </div>
    }
    return <div className="topnav">
      <div className="flex topnav-bar">
        <div className="flex-fill"><SearchPalette ref="search" query={this.props.searchQuery} /></div>
        <a className="compose-btn" onClick={onClickCompose}><i className="fa fa-plus" /> Compose</a>
      </div>
    </div>
  }
}