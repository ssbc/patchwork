'use babel'
import React from 'react'
import MsgList from './msg-list'
import Card from './msg-view/card'
import Oneline from './msg-view/oneline'
import { VerticalFilledContainer } from './index'
import { UserInfoHeader, UserInfoFolloweds, UserInfoFollowers, UserInfoFlags } from './user-info'
import app from '../lib/app'

const TABS = [
  { label: 'Posts' },
  { label: 'About' },
  { label: 'Data' }
]
const VIEW_POSTS = TABS[0]
const VIEW_ABOUT = TABS[1]
const VIEW_DATA = TABS[2]

export default class UserProfile extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentTab: TABS[0]
    }
  }

  onSelectTab(tab) {
    this.setState({ currentTab: tab })
  }

  render() {
    // HACK
    // there's too much built into the MsgList component, but I dont have time to refactor
    // until MsgList can be decomposed:
    // - render 1 way for about, and a different way for msg lists
    // - use the hero and toolbar attributes to maintain consistency (really shouldnt be part of MsgList)
    // - also, abuse the key attr on MsgList to get a rerender on view change
    const currentTab = this.state.currentTab
    const Hero = (props) => {
      return <UserInfoHeader key={this.props.pid} pid={this.props.pid} tabs={TABS} currentTab={currentTab} onSelectTab={this.onSelectTab.bind(this)} />
    }

    if (currentTab === VIEW_ABOUT) {
      // about render
      return <VerticalFilledContainer className="user-profile" key={this.props.pid}>
        <Hero />
        <div className="user-profile-about">
          <UserInfoFlags pid={this.props.pid} />
          <UserInfoFollowers pid={this.props.pid} />
          <UserInfoFolloweds pid={this.props.pid} />
        </div>
      </VerticalFilledContainer>
    }

    // normal msg-list render
    const ListItem = Card
    const feed = (opts) => {
      opts = opts || {}
      opts.id = this.props.pid
      return app.ssb.createUserStream(opts)
    }
    const cursor = (msg) => {
      if (msg)
        return msg.value.sequence
    }
    const forceRaw = (currentTab === VIEW_DATA)
    const filter = (currentTab === VIEW_POSTS)
      ? (msg) => {      
        // toplevel post by this user
        var c = msg.value.content
        if (!msg.plaintext)
          return false
        if (msg.value.author == this.props.pid && c.type == 'post' && !(c.root || c.branch))
          return true
      }
      : () => true // allow all
  
    // MsgList must have refreshOnReply
    // - Why: in other TABS, such as the inbox view, a reply will trigger a new message to be emitted in the livestream
    // - that's not the case for `createUserStream`, so we need to manually refresh a thread on reply
    return <div className="user-profile" key={this.props.pid}>
      <MsgList
        key={currentTab.label}
        threads
        dateDividers
        forceRaw={forceRaw}
        ListItem={ListItem}
        Hero={Hero}
        source={feed}
        cursor={cursor}
        filter={filter}
        refreshOnReply />
    </div>
  }
}