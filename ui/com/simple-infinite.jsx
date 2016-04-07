'use babel'
import React from 'react'
import { verticalFilled } from 'patchkit-vertical-filled'

// SimpleInfinite mimics the interface of react-infinite
// the main difference is, it doesnt try to do fancy performance improvements, like hiding offscreen elements
// this lets it tolerate elements with heights that aren't precomputed (which react-infinite cant do)

class SimpleInfinite extends React.Component {
  constructor(props) {
    super(props)
    this.scrollingTo = false

    this.onScroll = () => {
      // stop checking if out of more content
      if (!this.hasLoadableContent())
        return

      let el = this.refs.container
      if (el.offsetHeight + el.scrollTop + this.props.infiniteLoadBeginBottomOffset >= el.scrollHeight) {
        // hit bottom
        this.props.onInfiniteLoad(this.scrollingTo)
      }
    }
  }
  
  hasLoadableContent() {
    // this is how react-infinite signals there's no more content -- when this var is falsey
    return !!this.props.infiniteLoadBeginBottomOffset
  }

  getScrollTop() {
    const el = this.refs && this.refs.container
    if (!el) return 0
      console.log('a')
    return el.scrollTop
  }

  // check if a location is in scroll-view
  isPointVisible(left, top) {
    const el = this.refs && this.refs.container
    if (!el) return

    // TODO left

    if (el.scrollTop > top || el.scrollTop + this.props.containerHeight < top)
      return false

    return true
  }

  // scrolls & loads until a destination is reached
  scrollTo(top, lastTop) {
    const el = this.refs && this.refs.container
    if (!el) return

    // stop when:
    // - we reached the destination, or
    // - we're out of loadable content, and attempting to scroll further has not moved us
    if (el.scrollTop == top || (!this.hasLoadableContent() && el.scrollTop === lastTop)) {
      this.scrollingTo = false
      return // we're done
    }

    el.scrollTop = top
    if (el.scrollTop !== top) { // didnt get all the way there?
      this.scrollingTo = top
      setTimeout(() => this.scrollTo(top, el.scrollTop), 1) // try again in 1ms, after more loading has had a chance to occur
    } else
      this.scrollingTo = false // done
  }

  render() {
    return <div id={this.props.id} className="vertical-filled" ref="container" onScroll={this.onScroll} style={{height: this.props.containerHeight, overflow: 'auto'}}>{this.props.children}</div>
  }
}
export default verticalFilled(SimpleInfinite)