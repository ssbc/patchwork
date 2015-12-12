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
      <div className="flex-fill">{ topic.topic }</div>
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
      if (this.state.searchText.trim()) {
        this.props.onSelect({ topic: this.state.searchText })
        this.setState({ searchText: '', searchQuery: false })
      }
    }
  }

  onClearSearch() {
    this.setState({ searchText: '', searchQuery: false })    
  }

  render() {
    const selected = this.props.selected
    const selectedStr = (typeof selected === 'string') ? selected : false
    const search = this.state.searchText
    const renderTopic = (topic, i) => <TopicListItem key={topic.topic} topic={topic} selected={topic.topic === selected} onSelect={this.props.onSelect} />
    const isPartialMatch = topic => ((this.state.searchQuery) ? this.state.searchQuery.test(topic.topic) : true)
    const isExactMatch = what => topic => (topic.topic == what)
    const hasExactSelectedMatch = (!!selectedStr && this.props.topics.filter(isExactMatch(selectedStr)).length > 0)
    const hasExactSearchMatch = (!!search && this.props.topics.filter(isExactMatch(search)).length > 0)
    return <div className="topic-list" style={{height: this.props.height, overflow: 'auto'}}>
      <div className="topic-list-ctrls">
        <div className="search">
          { search ? <a className="btn highlighted clear" onClick={this.onClearSearch.bind(this)}>clear <i className="fa fa-times" /></a> : ''}
          <input type="text" placeholder="Choose a Topic" value={search} onChange={this.onSearchChange.bind(this)} onKeyDown={this.onSearchKeyDown.bind(this)} />
        </div>
      </div>
      <div className={cls(selected === ALL_TOPICS)} onClick={()=>this.props.onSelect(false)}>All Topics</div>
      { !!selectedStr && !hasExactSelectedMatch ? renderTopic({ topic: selectedStr }) : '' }
      { this.props.topics.filter(isPartialMatch).map(renderTopic) }
      { !!search && !hasExactSearchMatch ? renderTopic({ topic: search }) : '' }
    </div>
  }
}
