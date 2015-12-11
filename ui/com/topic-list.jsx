'use babel'
import pull from 'pull-stream'
import React from 'react'
import classNames from 'classnames'
import * as HelpCards from './help/cards'
import app from '../lib/app'

class TopicListItem extends React.Component {
  onClick() {
    this.props.onSelect(this.props.topic)
  }
  shouldComponentUpdate(nextProps) {
    return this.props.selected !== nextProps.selected
  }
  render() {
    const topic = this.props.topic
    return <div className={classNames({'topic-list-item': true, selected: this.props.selected })} onClick={this.onClick.bind(this)}>
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
    let renderTopic = (topic, i) => <TopicListItem key={topic.topic} topic={topic} selected={topic.topic === this.props.selected} onSelect={this.props.onSelect} />
    let isSearchMatch = topic => (this.state.searchQuery) ? this.state.searchQuery.test(topic.topic) : true
    return <div className="topic-list" style={{height: this.props.height, overflow: 'auto'}}>
      <div className="topic-list-ctrls">
        <div className="search">
          <input type="text" placeholder="Find topic" value={this.state.searchText} onChange={this.onSearchChange.bind(this)} />
        </div>
      </div>
      { this.props.topics.filter(isSearchMatch).map(renderTopic) }
      <HelpCards.ContactsTips />
    </div>
  }
}
export default TopicList
