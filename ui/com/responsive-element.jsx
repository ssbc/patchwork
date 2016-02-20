'use babel'
import React from 'react'
import ReactDOM from 'react-dom'

// Helper element to apply classes based on the width of the element
// This lets us do responsive sizing based on the region's width
export default class ResponsiveElement extends React.Component {
  constructor(props) {
    super(props)
    this.state = { widthClass: '' }
  }
  componentDidMount() {
    this.calcWidthClass()
    this.resizeListener = this.calcWidthClass.bind(this)
    window.addEventListener('resize', this.resizeListener)
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeListener)
  }
  calcWidthClass() {
    const widthStep = this.props.widthStep || 200
    if (this.refs && this.refs.el) {
      var rect = ReactDOM.findDOMNode(this.refs.el).getClientRects()[0]
      if (!rect)
        return
      // generate a set of width classes that look like eg: width-gt0, width-gt200, width-gt400.. etc
      // the classes will be an interval of props.widthStep
      var widthClasses = []
      for (var i=0; i <= Math.floor(rect.width / widthStep); i++)
        widthClasses.push('width-gt'+(i*widthStep))
      this.setState({ widthClass: widthClasses.join(' ') })
    }
  }
  render() {
    return <div ref="el" className={this.state.widthClass + ' ' + (this.props.className||'')}>{this.props.children||''}</div>
  }
}