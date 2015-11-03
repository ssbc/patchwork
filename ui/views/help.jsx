'use babel'
import React from 'react'
import { VerticalFilledContainer } from '../com/index'
import WelcomeHelp from '../com/help/welcome'

const HELP_SECTIONS = {
  index: WelcomeHelp, // TODO
  welcome: WelcomeHelp
}

export default class Help extends React.Component {
  render() {
    const section = this.props.params.section
    const HelpSection = HELP_SECTIONS[section] || HELP_SECTIONS.index
    return <div className="help"><VerticalFilledContainer><HelpSection /></VerticalFilledContainer></div>
  }
}