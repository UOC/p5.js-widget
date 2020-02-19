import React = require("react");

import PureComponent from "./pure-component";
import Toolbar from "./toolbar";
import Editor from "./editor";
import Preview from "./preview";
import { Autosaver } from "./autosaver";

interface ErrorMessage {
  message: string,
  line?: number
}

interface LogMessage {
  message: string
}

interface AppProps {
  initialContent: string,
  previewWidth: number,
  previewRelativeWidth: number,
  p5version: string,
  maxRunTime: number,
  baseSketchURL: string,
  autosaver?: Autosaver,
  autoplay?: boolean,
  showPreview?: boolean,
  previewInitialEmpty?: boolean,
  hideToolbar?: boolean,
  onNotify(data: Object): any,
  initialLog?: string[]
}

// Ugh, in practice, not all of these are truly optional, but we need
// to declare them as such in order to actually use setState() without
// ridiculous amounts of repetition.
//
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/4809
interface AppState {
  canUndo?: boolean,
  canRedo?: boolean,
  isPlaying?: boolean
  startPlayTimestamp?: number
  previewContent?: string
  editorContent?: string
  lastError?: ErrorMessage
  logs?: Array<LogMessage>
}

let ErrorMessage = (props: ErrorMessage) => (
  <div className="error-message">
    <span className="error-message-line">Line {props.line}:</span>
    {" " + props.message}
  </div>
);

let LogMessage = (props) => (
  <p key={props.index} className="log-message">
    {props.message.message}
  </p>
);

export default class App extends PureComponent<AppProps, AppState> {
  constructor(props) {
    super(props);
    this.state = {
      canUndo: false,
      canRedo: false,
      previewContent: this.props.previewInitialEmpty ? '' : this.props.initialContent,
      editorContent: this.props.initialContent,
      logs: []
    };
  }

  componentDidMount() {
    let autosave = this.props.autosaver && this.props.autosaver.restore();

    if (autosave && autosave !== this.state.editorContent) {
      this.setState({ editorContent: autosave });
    } else if (this.props.autoplay) {
      this.handlePlayClick();
    }
  }

  handleEditorChange = (newValue: string, canUndo: boolean,
                        canRedo: boolean) => {
    this.setState({
      editorContent: newValue,
      canUndo: canUndo,
      canRedo: canRedo
    });
    this.props.autosaver.save(newValue);
  }

  handlePreviewError = (message: string, line?: number) => {
    this.setState({
      lastError: {
        message: message,
        line: line
      }
    });
  }

  handleConsoleLog = (message: string[]) => {
    let logs = message.map(m => ({message: m})) as [LogMessage];
    const messages = this.state.logs.concat(logs);

    this.setState({
      logs: messages
    });  
  }

  handleRevertClick = () => {
    this.setState({
      isPlaying: false,
      editorContent: this.props.initialContent
    });
  }

  handlePlayClick = () => {
    this.notifyContent('play');
    this.setState((prevState, props) => ({
      isPlaying: true,
      previewContent: prevState.editorContent,
      startPlayTimestamp: Date.now(),
      lastError: null,
      logs: []
    }));
  }

  handleStopClick = () => {
    this.setState({ isPlaying: false });
    this.refs.preview.stop();
  }

  handleUndoClick = () => {
    this.refs.editor.undo();
  }

  handleRedoClick = () => {
    this.refs.editor.redo();
  }

  notifyContent = (name: string) => {
    this.props.onNotify({name, sourceCode:this.state.editorContent})
  }

  changeContent = (content: string) => {
    this.setState({
      isPlaying: false,
      editorContent: content
    });
  }

  refs: {
    [key: string]: (any),
    editor: Editor,
    preview: Preview
  }

  render() {
    let errorLine = null;
    let canRevert = (this.state.editorContent !== this.props.initialContent);

    if (this.state.lastError &&
        this.state.editorContent === this.state.previewContent) {
      errorLine = this.state.lastError.line;
    }

    return (
      <div className="app">
        {!this.props.hideToolbar ? <Toolbar
         onPlayClick={this.handlePlayClick}
         onStopClick={this.state.isPlaying && this.handleStopClick}
         onUndoClick={this.state.canUndo && this.handleUndoClick}
         onRedoClick={this.state.canRedo && this.handleRedoClick}
         onRevertClick={canRevert && this.handleRevertClick} /> : null}
        <div className="panes">
          <Editor ref="editor"
                  content={this.state.editorContent}
                  errorLine={errorLine}
                  onChange={this.handleEditorChange} />
          <div className="preview-holder-wrapper">
          {this.state.isPlaying || this.props.showPreview
            ? <Preview ref="preview"
                       content={this.state.previewContent}
                       baseSketchURL={this.props.baseSketchURL}
                       p5version={this.props.p5version}
                       maxRunTime={this.props.maxRunTime}
                       width={this.props.previewWidth}
                       relativeWidth={this.props.previewRelativeWidth}
                       timestamp={this.state.startPlayTimestamp}
                       onError={this.handlePreviewError} 
                       onLog={this.handleConsoleLog} />
            : null}
          </div>
        </div>
        <div className="status-bar">
          {this.state.lastError
           ? <ErrorMessage {...this.state.lastError} />
           : null}
           {this.state.logs.map((m, i) => <LogMessage message={m} index={i} />)}
        </div>
      </div>
    );
  }
}
