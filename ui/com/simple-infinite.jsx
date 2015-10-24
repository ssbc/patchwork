'use babel'
import React from 'react'
import { verticalFilled } from './index'

// SimpleInfinite mimics the interface of react-infinite
// the main difference is, it doesnt try to do fancy performance improvements, like hiding offscreen elements
// this lets it tolerate elements with heights that aren't precomputed (which react-infinite cant do)

class SimpleInfinite extends React.Component {
  constructor(props) {
    super(props)
    this.onScroll = () => {
      // stop checking if bottom offset isnt defined
      if (!this.props.infiniteLoadBeginBottomOffset)
        return

      let el = this.refs.container.getDOMNode()
      if (el.offsetHeight + el.scrollTop + this.props.infiniteLoadBeginBottomOffset >= el.scrollHeight) {
        // hit bottom
        this.props.onInfiniteLoad()
      }
    }
  }
  render() {
    return <div ref="container" onScroll={this.onScroll} style={{height: this.props.height, overflow: 'auto'}}>{this.props.children}</div>
  }
}
export default verticalFilled(SimpleInfinite)