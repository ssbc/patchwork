'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import app from '../lib/app'

export default class Search extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.value.timestamp, msg.value.author]
  }

  render() {
    const searchRegex = new RegExp(this.props.params.query||'', 'i')
    const Hero = (props) => <h2 style={{fontWeight: 300, textAlign: 'center'}}>Searching for "{this.props.params.query}"</h2>
    return <div id="search" key={this.props.params.query}>
      <MsgList
        ref="list"
        searchRegex={searchRegex}
        dateDividers
        Hero={Hero}
        ListItem={Card}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="No results found."
        source={app.ssb.createLogStream} />
    </div>
  }
}