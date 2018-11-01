import React from "react";
import PropTypes from "prop-types";
import { remote } from "electron";
import { join } from "path";
import AbstractComponent from "component/AbstractComponent";
const APP_DIRECTORY = remote.app.getAppPath(),
      DEMO_DIRECTORY = join( APP_DIRECTORY, "demo" );


export class Welcome extends AbstractComponent {

  static propTypes = {
    action: PropTypes.shape({
      loadProject: PropTypes.func.isRequired,
      updateApp: PropTypes.func.isRequired
    })
  }

  onOpenDemoProject = ( e ) => {
    e.preventDefault();
    this.props.action.loadProject( DEMO_DIRECTORY );
  }

  onCreateProject = ( e ) => {
    e.preventDefault();
    this.props.action.updateApp({ newProjectModal: true });
  }

  render() {
    return (
      <div className="welcome">
        <h1>Welcome!</h1>
        <p>You are using Puppetry, a tool to build End-To-End automation tests without coding.</p>

        <p>What you can do now is to open a
          { " " } <a href="#empty" onClick={ this.onOpenDemoProject }>demo project</a> or
          { " " } <a href="#empty" onClick={ this.onCreateProject }>create a new one</a>.</p>
        <p>Project may contain one or more <mark>suites</mark>. Every suite includes:</p>
        <ul>
          <li><mark>Test group</mark> - consists of one or more logically related tests</li>
          <li><mark>Test</mark> - consists of one or more commands and assertions</li>
          <li><mark>Command</mark> - instruction to Puppeteer, can be a command like
            <code>page.goto(&quot;some URL&quot;)</code> or an assertion
            <code>BUTTON.property(&quot;disabled&quot;) == true</code></li>
          <li><mark>Test targets</mark> - can be <code>page</code>
          or any target node specified in Test targets pane.</li>
        </ul>
        <p>If you experience any problems with application, please, report to { " " }
          <a onClick={ this.onExtClick }
            href="https://github.com/dsheiko/puppetry/issues"
            rel="noopener noreferrer">github.com/dsheiko/puppetry/issues</a></p>
      </div>

    );
  }
}
