'use babel'
import React from 'react'
import { VerticalFilledContainer } from '../com'
import { ALL_TOPICS, TopicList } from '../com/topic-list'
import app from '../lib/app'

export default class Topics extends React.Component {
  constructor(props) {
    super(props)
    this.state = { topics: app.topics||[] }
    app.on('update:topics', () => this.setState({ topics: app.topics }))
  }
  onSelect(topic) {
    if (!topic)
      app.history.pushState(null, '/')
    else
      app.history.pushState(null, '/topic/' + encodeURIComponent(topic.topic))
  }
  render() {
    const path = this.props.location.pathname
    const selectedTopic = (path.indexOf('/topic/') === 0)
      ? decodeURIComponent(path.slice('/topic/'.length))
      : path === '/'
      ? ALL_TOPICS
      : false

    return <VerticalFilledContainer id="data">
      <TopicList topics={app.topics} selected={selectedTopic} onSelect={this.onSelect.bind(this)} />
    </VerticalFilledContainer>
  }
}