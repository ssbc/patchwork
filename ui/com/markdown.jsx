'use babel'
import React from 'react'
import markdown from '../lib/markdown'
import Drop from 'tether-drop'

export class Block extends React.Component {
  componentDidMount() {
    this.drops = Array.from(this.refs.md.querySelectorAll('a')).map(linkEl => {
      return new Drop({
        target: linkEl,
        content: markdown.getLinkTooltip, //linkEl.getAttribute('href'),
        openOn: 'hover',
        hoverOpenDelay: 250,
        classes: 'drop-theme-tooltip drop-theme-arrows',
        tetherOptions: {
          attachment: 'top center',
          targetAttachment: 'bottom center',
          constraints: [
            {
              to: 'scrollParent',
              attachment: 'together',
              pin: true
            }
          ]
        }
      })
    })
  }
  componentWillUnmount() {
    this.drops.forEach(drop => drop.destroy())
  }
  render() {
    return <div ref="md" className="markdown markdown-block" dangerouslySetInnerHTML={{__html: markdown.block(this.props.md, this.props.msg)}} />
  }
}
export class Inline extends React.Component {
  render() {
    return <span className="markdown markdown-inline" dangerouslySetInnerHTML={{__html: markdown.inline(this.props.md)}} />
  }
}