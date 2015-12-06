'use babel'
import React from 'react'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import Tabs from '../com/tabs'
import * as HelpCards from '../com/help/cards'
import WelcomeHelp from '../com/help/welcome'
import app from '../lib/app'
import social from '../lib/social-graph'

export default class NewsFeed extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.value.timestamp, msg.value.author]
  }

  helpCards() {
    return <div className="cards-flow">
      <HelpCards.NewsFeed />
      <HelpCards.Pubs />
      <HelpCards.FindingUsers />
    </div>
  }

  onSelectTopic(option) {
    app.history.pushState(null, option.url)
  }

  render() {
    const toolbar = () => {
      var selected = 0
      var options = app.topics.map((t, i) => { 
        // detect if selected
        if (this.props.params.topic && t.topic === this.props.params.topic)
          selected = i+1
        // render option
        return {
          url: '/topic/' + encodeURIComponent(t.topic),
          label: <span><i className="fa fa-commenting-o"/> {t.topic}</span>
        }
      })
      // add newsfeed option
      options.unshift({ url: '/', label: <span><i className="fa fa-group" /> All</span> })
      return <Tabs options={options} selected={options[selected]} onSelect={this.onSelectTopic.bind(this)} />
    }

    // select source based on topic selected
    var source = (opts) => {
      if (this.props.params.topic) 
        return app.ssb.patchwork.createTopicStream(this.props.params.topic, opts)
      return app.ssb.patchwork.createNewsfeedStream(opts)
    }

    return <div id="newsfeed">
      <MsgList
        key={this.props.params.topic}
        threads
        search
        queueNewMsgs
        dateDividers
        ListItem={Card}
        toolbar={toolbar}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your newsfeed is empty."
        append={this.helpCards.bind(this)}
        source={source}
        cursor={this.cursor} />
    </div>
  }
}