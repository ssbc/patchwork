'use babel'
import pull from 'pull-stream'
import React from 'react'
import classNames from 'classnames'
import app from '../lib/app'

function cls (selected) {
  return classNames({ 'topic-list-item': true, selected: selected })
}

class TopicListItem extends React.Component {
  onClick() {
    this.props.onSelect(this.props.topic)
  }
  shouldComponentUpdate(nextProps) {
    return this.props.selected !== nextProps.selected
  }
  render() {
    const topic = this.props.topic
    return <div className={cls(this.props.selected)} onClick={this.onClick.bind(this)}>
      { topic.topic } ({ topic.count })
    </div>
  }
}

class TopicList extends React.Component {
  constructor(props) {
    super(props)
    this.state = { searchText: '', searchQuery: false }
  }

  onSearchChange(e) {
    const v = e.target.value
    this.setState({ searchText: v, searchQuery: (v) ? new RegExp(v, 'i') : false })
  }

  render() {
    const search = this.state.searchText
    const renderTopic = (topic, i) => <TopicListItem key={topic.topic} topic={topic} selected={topic.topic === this.props.selected} onSelect={this.props.onSelect} />
    const isPartialMatch = topic => ((this.state.searchQuery) ? this.state.searchQuery.test(topic.topic) : true)
    const isExactMatch = topic => (topic.topic == search)
    const hasExactMatch = (!!search && this.props.topics.filter(isExactMatch).length > 0)
    return <div className="topic-list" style={{height: this.props.height, overflow: 'auto'}}>
      <div className="topic-list-ctrls">
        <div className="search">
          <input type="text" placeholder="Find topic" value={search} onChange={this.onSearchChange.bind(this)} />
        </div>
      </div>
      <div className={cls(!this.props.selected)} onClick={()=>this.props.onSelect(false)}>All Topics</div>
      { this.props.topics.filter(isPartialMatch).map(renderTopic) }
      { !!search && !hasExactMatch ?
        <div className={cls(this.props.selected == search)} onClick={()=>this.props.onSelect({ topic: search })}>+ {search}</div>
        : '' }
    </div>
  }
}
export default TopicList
