// It is required to load react-ace first.
// eslint-disable-next-line simple-import-sort/imports
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/snippets/css';
import 'ace-builds/src-noconflict/snippets/javascript';
import 'ace-builds/src-noconflict/snippets/text';
import 'ace-builds/src-noconflict/ext-language_tools';

import './style.scss';

import { Component } from '@wordpress/element';

/**
 * Component Class
 */
export default class CodeEditor extends Component {
	constructor(...args) {
		super(...args);

		this.state = {
			codePlaceholder: this.props.codePlaceholder,
		};

		this.maybeRemovePlaceholder = this.maybeRemovePlaceholder.bind(this);
	}

	componentDidMount() {
		this.maybeRemovePlaceholder();
	}

	/**
	 * Remove placeholder after first change.
	 */
	maybeRemovePlaceholder() {
		const { value } = this.props;

		const { codePlaceholder } = this.state;

		if (value && codePlaceholder) {
			this.setState({ codePlaceholder: '' });
		}
	}

	render() {
		const { value, onChange, mode, maxLines, minLines } = this.props;

		const { codePlaceholder } = this.state;

		return (
			<AceEditor
				className="vpf-component-code-editor"
				theme="textmate"
				onLoad={(editor) => {
					editor.renderer.setScrollMargin(16, 16, 16, 16);
					editor.renderer.setPadding(16);
				}}
				fontSize={12}
				showPrintMargin
				showGutter
				highlightActiveLine={false}
				width="100%"
				setOptions={{
					enableBasicAutocompletion: true,
					enableLiveAutocompletion: true,
					enableSnippets: true,
					showLineNumbers: true,
					printMargin: false,
					tabSize: 2,
				}}
				editorProps={{
					$blockScrolling: Infinity,
				}}
				value={value || codePlaceholder}
				onChange={(val) => {
					onChange(val === codePlaceholder ? '' : val);

					this.maybeRemovePlaceholder();
				}}
				mode={mode}
				maxLines={maxLines}
				minLines={minLines}
			/>
		);
	}
}
