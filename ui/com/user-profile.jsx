'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import MsgList from './msg-list'
import Card from './msg-view/card'
import Oneline from './msg-view/oneline'
import { VerticalFilledContainer } from './index'
import { UserInfoHeader, UserInfoFolloweds, UserInfoFollowers, UserInfoFlags } from './user-info'
import app from '../lib/app'
import u from '../lib/util'

const VIEW_PMS = { label: 'You & Them' }
const VIEW_POSTS = { label: 'Posts' }
const VIEW_ABOUT = { label: 'About' }
const VIEW_DATA = { label: 'Data' }
const SELF_TABS = [VIEW_POSTS, VIEW_ABOUT, VIEW_DATA]
const OTHER_TABS = [VIEW_PMS, VIEW_POSTS, VIEW_ABOUT, VIEW_DATA]

export default class UserProfile extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentTabIndex: 0
    }
  }

  getTabs() {
    return (this.props.pid == app.user.id) ? SELF_TABS : OTHER_TABS
  }

  onSelectTab(tab) {
    const tabs = this.getTabs()
    this.setState({ currentTabIndex: tabs.indexOf(tab) })
  }

  render() {
    // HACK
    // there's too much built into the MsgList component, but I dont have time to refactor
    // until MsgList can be decomposed:
    // - render 1 way for about, and a different way for msg lists
    // - use the hero and toolbar attributes to maintain consistency (really shouldnt be part of MsgList)
    // - also, abuse the key attr on MsgList to get a rerender on view change
    const tabs = this.getTabs()
    const currentTab = tabs[this.state.currentTabIndex] || tabs[0]
    const Hero = (props) => {
      return <UserInfoHeader key={this.props.pid} pid={this.props.pid} tabs={tabs} currentTab={currentTab} onSelectTab={this.onSelectTab.bind(this)} />
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
    const name = u.getName(this.props.pid)
    const isSelf = this.props.pid == app.user.id
    const feed = (currentTab === VIEW_PMS)
      ? app.ssb.patchwork.createInboxStream
      : (opts) => {
        opts = opts || {}
        opts.id = this.props.pid
        return app.ssb.createUserStream(opts)
      }
    const cursor = (msg) => {
      if (msg)
        return msg.value.sequence
    }
    const forceRaw = (currentTab === VIEW_DATA)
    const filter = (currentTab === VIEW_PMS)
      ? (msg) => {      
        // private posts with this author
        var c = msg.value.content
        if (msg.plaintext)
          return false
        const isRecp = mlib.links(c.recps).filter(r => r.link === this.props.pid).length > 0
        if (c.type == 'post' && !(c.root || c.branch) && isRecp)
          return true
      }
      : (currentTab === VIEW_POSTS)
        ? (msg) => {      
          // toplevel post by this user
          var c = msg.value.content
          if (!msg.plaintext)
            return false
          if (c.type == 'post' && !(c.root || c.branch))
            return true
        }
        : () => true // allow all
    const composerProps = (isSelf)
      ? { isPublic: true, placeholder: 'Write a new public post' }
      : { isPublic: false, recps: [this.props.pid], placeholder: 'Write a private post to '+name }
  
    // MsgList must have refreshOnReply
    // - Why: in other TABS, such as the inbox view, a reply will trigger a new message to be emitted in the livestream
    // - that's not the case for `createUserStream`, so we need to manually refresh a thread on reply
    return <div className="user-profile" key={this.props.pid}>
      <MsgList
        key={currentTab.label}
        threads
        dateDividers
        composer composerProps={composerProps}
        forceRaw={forceRaw}
        ListItem={Card}
        Hero={Hero}
        source={feed}
        cursor={cursor}
        filter={filter}
        refreshOnReply />
    </div>
  }
}