'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import Card from '../com/msg-list/card'
import Oneline from '../com/msg-list/oneline'
import Tabs from '../com/tabs'
import { VerticalFilledContainer } from '../com/index'
import { UserInfoHeader, UserInfoFolloweds, UserInfoFollowers } from '../com/user-info'
import app from '../lib/app'

const VIEWS = [
  { label: 'About' },
  { label: 'Posts' },
  { label: 'Private Messages' }
]
const VIEW_ABOUT = VIEWS[0]
const VIEW_POSTS = VIEWS[1]
const VIEW_PMS   = VIEWS[2]

export default class Profile extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      pid: decodeURIComponent(this.props.params.id),
      currentView: VIEWS[0]
    }
  }

  componentWillReceiveProps(newProps) {
    this.setState({ pid: decodeURIComponent(newProps.params.id) })
  }

  onSelectFilter(view) {
    this.setState({ currentView: view })
  }

  render() {
    // HACK
    // there's too much built into the MsgList component, but I dont have time to refactor
    // until MsgList can be decomposed, we stuff custom behaviors into it
    // how:
    // - render 1 way for about, a wholly different way for msg lists
    // - use the hero and toolbar attributes to maintain consistency (really shouldnt be part of MsgList)
    // - also, abuse the key attr on MsgList to get a rerender on view change
    const currentView = this.state.currentView
    const hero = () => {
      return <UserInfoHeader key={this.state.pid} pid={this.state.pid} />
    }
    const toolbar = () => {
      return <Tabs options={VIEWS} selected={currentView} onSelect={this.onSelectFilter.bind(this)} />
    }

    if (currentView === VIEW_ABOUT) {
      // about render
      return <div id="profile" key={this.state.pid}>
        {hero()}
        <div className="toolbar" style={{marginRight: '40px'}}>{toolbar()}</div>
        <UserInfoFollowers pid={this.state.pid} />
        <UserInfoFolloweds pid={this.state.pid} />
      </div>
    }

    // normal msg-list render
    const ListItem = (currentView === VIEW_PMS) ? Oneline : Card
    const feed = (opts) => {
      opts = opts || {}
      opts.id = this.state.pid
      return app.ssb.createUserStream(opts)
    }
    const cursor = (msg) => {
      if (msg)
        return msg.value.sequence
    }
    const filter = (currentView === VIEW_PMS)
      ? (msg) => {
        // toplevel post by this user
        var c = msg.value.content
        if (msg.plaintext)
          return false
        if (msg.value.author == this.state.pid && c.type == 'post' && !(c.root || c.branch))
          return true
      }
      : (msg) => {
        // toplevel post by this user
        var c = msg.value.content
        if (!msg.plaintext)
          return false
        if (msg.value.author == this.state.pid && c.type == 'post' && !(c.root || c.branch))
          return true
      }
  
    // MsgList must have refreshOnReply
    // - Why: in other views, such as the inbox view, a reply will trigger a new message to be emitted in the livestream
    // - that's not the case for `createUserStream`, so we need to manually refresh a thread on reply
    return <div id="profile" key={this.state.pid}>
      <MsgList threads key={currentView.label} ListItem={ListItem} hero={hero} toolbar={toolbar} source={feed} cursor={cursor} filter={filter} refreshOnReply />
    </div>
  }
}