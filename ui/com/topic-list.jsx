'use babel'
import pull from 'pull-stream'
import React from 'react'
import classNames from 'classnames'
import app from '../lib/app'

export const ALL_TOPICS = Symbol('all')

function cls (selected) {
  return classNames({ 'topic-list-item': true, flex: true, selected: selected })
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
    const onSelect = () => this.props.onSelect(this.props.topic)
    return <div className={cls(this.props.selected)} onClick={onSelect}>
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

  onClearSearch() {
    this.setState({ searchText: '', searchQuery: false })    
  }

  render() {
    const selected = this.props.selected
    const search = this.state.searchText
    const renderTopic = (topic, i) => <TopicListItem key={topic.topic} topic={topic} selected={topic.topic === selected} onSelect={this.props.onSelect} />
    const isPartialMatch = topic => ((this.state.searchQuery) ? this.state.searchQuery.test(topic.topic) : true)
    const isExactMatch = topic => (topic.topic == search)
    const hasExactMatch = (!!search && this.props.topics.filter(isExactMatch).length > 0)
    return <div className="topic-list" style={{height: this.props.height, overflow: 'auto'}}>
      <div className="topic-list-ctrls">
        <div className="search">
          { search ? <a className="btn highlighted clear" onClick={this.onClearSearch.bind(this)}>clear <i className="fa fa-times" /></a> : ''}
          <input type="text" placeholder="Find topic" value={search} onChange={this.onSearchChange.bind(this)} />
        </div>
      </div>
      <div className={cls(selected === ALL_TOPICS)} onClick={()=>this.props.onSelect(false)}>All Topics</div>
      { this.props.topics.filter(isPartialMatch).map(renderTopic) }
      { !!search && !hasExactMatch ? renderTopic({ topic: search }) : '' }
    </div>
  }
}
