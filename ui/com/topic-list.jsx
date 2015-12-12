'use babel'
import pull from 'pull-stream'
import React from 'react'
import classNames from 'classnames'
import app from '../lib/app'

export const ALL_TOPICS = Symbol('all')

function cls (selected, hasNew) {
  return classNames({ 'topic-list-item': true, flex: true, selected: selected, unread: hasNew })
}

class TopicListItem extends React.Component {
  shouldComponentUpdate(nextProps) {
    return this.props.selected !== nextProps.selected || this.props.topic !== nextProps.topic
  }
  onPin(e) {
    e.preventDefault()
    e.stopPropagation()
    app.ssb.patchwork.toggleTopicPinned(this.props.topic.topic, err => {
      if (err)
        app.issue('Failed to pin topic', err)
    })
  }
  render() {
    const topic = this.props.topic
    const onSelect = () => this.props.onSelect(topic)
    return <div className={cls(this.props.selected, topic.hasNew)} onClick={onSelect}>
      <div className="flex-fill">{ this.props.isNew ? '+ ' : '' }{ topic.topic }</div>
      <div className="ctrls">
        <a className={classNames({ pin: true, pinned: topic.pinned })} onClick={this.onPin.bind(this)}><i className="fa fa-thumb-tack" /></a>
      </div>
    </div>
  }
}

export class TopicList extends React.Component {
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
        this.props.onSelect({ topic: this.state.searchText })
    }
  }

  onClearSearch() {
    this.setState({ searchText: '', searchQuery: false })    
  }

  onClickCreate() {
    this.props.onSelect({ topic: this.state.searchText })
  }

  render() {
    const selected = this.props.selected
    const search = this.state.searchText
    const renderTopic = (topic, isNew) => <TopicListItem key={topic.topic} topic={topic} isNew={isNew===true} selected={topic.topic === selected} onSelect={this.props.onSelect} />
    const isPartialMatch = topic => ((this.state.searchQuery) ? this.state.searchQuery.test(topic.topic) : true)
    return <div className="topic-list" style={{height: this.props.height, overflow: 'auto'}}>
      <div className="topic-list-ctrls">
        <div className="search">
          <input ref="searchInput" type="text" placeholder="Choose a Topic" value={search} onChange={this.onSearchChange.bind(this)} onKeyDown={this.onSearchKeyDown.bind(this)} />
        </div>
      </div>
      <div className={cls(selected === ALL_TOPICS)} onClick={()=>this.props.onSelect(false)}>All Topics</div>
      { this.props.topics.filter(isPartialMatch).map(renderTopic) }
      <div style={{fontWeight: 'normal', color: 'gray', padding: '0 10px'}}>
        <p><small>{"Topics are channels for conversations."}</small></p>
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
