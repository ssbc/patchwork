'use babel'
import React from 'react'
import MsgList from './msg-list'
import Card from './msg-view/card'
import Oneline from './msg-view/oneline'
import Tabs from './tabs'
import { VerticalFilledContainer } from './index'
import { UserInfoHeader, UserInfoFolloweds, UserInfoFollowers, UserInfoFlags } from './user-info'
import app from '../lib/app'

const VIEWS = [
  { label: 'Posts' },
  { label: 'Private Messages' },
  { label: 'About' }
]
const VIEW_POSTS = VIEWS[0]
const VIEW_PMS   = VIEWS[1]
const VIEW_ABOUT = VIEWS[2]

export default class UserProfile extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentView: VIEWS[0]
    }
  }

  onSelectFilter(view) {
    this.setState({ currentView: view })
  }

  render() {
    // HACK
    // there's too much built into the MsgList component, but I dont have time to refactor
    // until MsgList can be decomposed:
    // - render 1 way for about, and a different way for msg lists
    // - use the hero and toolbar attributes to maintain consistency (really shouldnt be part of MsgList)
    // - also, abuse the key attr on MsgList to get a rerender on view change
    const currentView = this.state.currentView
    const hero = () => {
      return <UserInfoHeader key={this.props.pid} pid={this.props.pid} />
    }
    const toolbar = () => {
      return <Tabs options={VIEWS} selected={currentView} onSelect={this.onSelectFilter.bind(this)} />
    }

    if (currentView === VIEW_ABOUT) {
      // about render
      return <VerticalFilledContainer className="user-profile" key={this.props.pid}>
        {hero()}
        <div className="toolbar"><div className="centered">{toolbar()}</div></div>
        <div className="user-profile-about">
          <UserInfoFlags pid={this.props.pid} />
          <UserInfoFollowers pid={this.props.pid} />
          <UserInfoFolloweds pid={this.props.pid} />
        </div>
      </VerticalFilledContainer>
    }

    // normal msg-list render
    const ListItem = (currentView === VIEW_PMS) ? Oneline : Card
    const feed = (opts) => {
      opts = opts || {}
      opts.id = this.props.pid
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
        if (msg.value.author == this.props.pid && c.type == 'post' && !(c.root || c.branch))
          return true
      }
      : (msg) => {
        // toplevel post by this user
        var c = msg.value.content
        if (!msg.plaintext)
          return false
        if (msg.value.author == this.props.pid && c.type == 'post' && !(c.root || c.branch))
          return true
      }
  
    // MsgList must have refreshOnReply
    // - Why: in other views, such as the inbox view, a reply will trigger a new message to be emitted in the livestream
    // - that's not the case for `createUserStream`, so we need to manually refresh a thread on reply
    return <div className="user-profile" key={this.props.pid}>
      <MsgList threads key={currentView.label} ListItem={ListItem} hero={hero} toolbar={toolbar} source={feed} cursor={cursor} filter={filter} refreshOnReply />
    </div>
  }
}