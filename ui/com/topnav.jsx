'use babel'
import React from 'react'
import classNames from 'classnames'
import app from '../lib/app'
import SearchPalette from 'patchkit-search-palette'
import Composer from 'patchkit-post-composer'
import { getResults } from '../lib/search'
import t from 'patchwork-translations'

export default class TopNav extends React.Component {
  constructor(props) {
    super(props)
    this.state = { isComposerOpen: false }

    // listen for events that should update our state
    this._focusSearch = this.focusSearch.bind(this)
    app.on('focus:search', this._focusSearch)
  }
  componentWillUnmount() {
    app.removeListener('focus:search', this._focusSearch)
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
    return <div className="topnav">
      <div className="flex topnav-bar">
        <div className="flex-fill"><SearchPalette ref="search" query={this.props.searchQuery} placeholder={this.props.placeholder} getResults={getResults} /></div>
        { this.props.composer
          ? ( this.state.isComposerOpen
            ? <a className="btn" onClick={onClickCompose}><i className="fa fa-times" /> {t('Cancel')}</a>
            : <a className="btn highlighted" onClick={onClickCompose}><i className="fa fa-plus" /> {t('Compose')}</a> )
          : '' }
      </div>
      { this.state.isComposerOpen && this.props.composer
        ? <div ref="composer" className="topnav-composer">
            <Composer {...this.props.composerProps} suggestOptions={app.suggestOptions} channels={app.channels} onSend={this.onSend.bind(this)} />
          </div>
        : '' }
    </div>
  }
}