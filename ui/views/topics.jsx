'use babel'
import React from 'react'
import { VerticalFilledContainer } from '../com'
import TopicList from '../com/topic-list'
import app from '../lib/app'

export default class Topics extends React.Component {
  onSelect(topic) {
    if (!topic)
      app.history.pushState(null, '/')
    else
      app.history.pushState(null, '/topic/' + encodeURIComponent(topic.topic))
  }
  render() {
    const path = this.props.location.pathname
    const selectedTopic = (path.indexOf('/topic/') === 0) ? path.slice('/topic/'.length) : false
    return <VerticalFilledContainer id="data">
      <TopicList topics={app.topics} selected={selectedTopic} onSelect={this.onSelect.bind(this)} />
    </VerticalFilledContainer>
  }
}