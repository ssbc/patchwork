'use babel'
import pull from 'pull-stream'
import React from 'react'
import classNames from 'classnames'
import app from '../lib/app'

export const ALL_CHANNELS = Symbol('all')

function cls (selected, hasNew) {
  return classNames({ 'channel-list-item': true, flex: true, selected: selected, unread: hasNew })
}

class ChannelListItem extends React.Component {
  shouldComponentUpdate(nextProps) {
    return this.props.selected !== nextProps.selected || this.props.channel !== nextProps.channel
  }
  onPin(e) {
    e.preventDefault()
    e.stopPropagation()
    app.ssb.patchwork.toggleChannelPinned(this.props.channel.name, err => {
      if (err)
        app.issue('Failed to pin channel', err)
    })
  }
  render() {
    const channel = this.props.channel
    const onSelect = () => this.props.onSelect(channel)
    return <div className={cls(this.props.selected, channel.hasNew)} onClick={onSelect}>
      <div className="flex-fill">#{ channel.name }</div>
      <div className="ctrls">
        <a className={classNames({ pin: true, pinned: channel.pinned })} onClick={this.onPin.bind(this)}><i className="fa fa-thumb-tack" /></a>
      </div>
    </div>
  }
}

export class ChannelList extends React.Component {
  constructor(props) {
    super(props)
    this.state = { searchText: '', searchQuery: false }
  }

  onSearchChange(e) {
    const v = e.target.value
    this.setState({ searchText: v, searchQuery: (v) ? new RegExp(v, 'i') : false })
  }

  onSearchKeyDown(e) {
    if (e.keyCode == 13) {
      e.preventDefault()
      e.stopPropagation()
      if (this.state.searchText.trim())
        this.props.onSelect({ name: this.state.searchText })
    }
  }

  onClearSearch() {
    this.setState({ searchText: '', searchQuery: false })    
  }

  onClickCreate() {
    this.props.onSelect({ name: this.state.searchText })
  }

  render() {
    const selected = this.props.selected
    const search = this.state.searchText
    
    // predicates
    const isPartialMatch = channel => ((this.state.searchQuery) ? this.state.searchQuery.test(channel.name) : true)
    const isPinned = b => channel => (!!channel.pinned == b)

    // filtered channels
    const pinnedChannels   = this.props.channels.filter(isPinned(true)).filter(isPartialMatch)
    const unpinnedChannels = this.props.channels.filter(isPinned(false)).filter(isPartialMatch)

    // render
    const renderChannel = channel => <ChannelListItem key={channel.name} channel={channel} selected={channel.name === selected} onSelect={this.props.onSelect} />
    return <div className="channel-list" style={{height: this.props.height, overflow: 'auto'}}>
      <div className="channel-list-ctrls">
        <div className="search">
          <input ref="searchInput" type="text" placeholder="Choose a Channel" value={search} onChange={this.onSearchChange.bind(this)} onKeyDown={this.onSearchKeyDown.bind(this)} />
        </div>
      </div>
      <div className={cls(selected === ALL_CHANNELS)} onClick={()=>this.props.onSelect(false)} style={{paddingBottom: 0}}>All Channels</div>
      { pinnedChannels.map(renderChannel) }
      { unpinnedChannels.length ? <hr/> : '' }
      { unpinnedChannels.map(renderChannel) }
      <hr/>
      <div style={{fontWeight: 'normal', color: 'gray', padding: '0 10px'}}>
        <p><small>Channels are topical filters for conversations.</small></p>
        <p>
          { search
            ? <small><a onClick={this.onClickCreate.bind(this)}>Open "{search}"</a> | </small>
            : '' }
          { search
            ? <small><a onClick={this.onClearSearch.bind(this)}>Clear filter</a></small>
            : '' }
        </p>
      </div>
    </div>
  }
}
