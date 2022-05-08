// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// MJMJ things to do
// - Read by line and color lines by regex
// - Support multiple colors
//		- Color schema:
// {
// 	regex: "",
// 	color: "",		// Should be multiple, for the light / dark modes?
// 	id: "",			// Give info
// 	fullLine: true,	// If applies full line or just for regex
// 	priority: 1,	// Used to order the colors when multiple apply in the same line.
// }
// - Have it only trigger on files when requested, not apply all
//		- Should it still update when the file updates, or need to be re-run?
//		- I think this is why the example for highlighting had package.json:activationEvents = "*",
//		so that it always triggered instead of when a command was run for the first time.

class HighlightInfo {
	regEx!: RegExp;
	color: string;
	id: string;

	constructor(regExStr: string, color: string, id: string) {
		this.regEx = new RegExp(regExStr);
		this.color = color;
		this.id = id;
	}
}

var highlightColors: HighlightInfo[] = [];

function findHighlightInfo(line: string): HighlightInfo | null {
	for (let hi of highlightColors) {
		if (hi.regEx.exec(line) !== null) {
			return hi;
		}
	}

	return null;
}

function initializeInfo(): void {
	let config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('log-highlighter');

	let regexps: string[] | undefined = config.get<string[]>('regexps');
	if (regexps === undefined) {
		console.log("Regexps missing from config file.");

		return;
	}

	let colors: string[] | undefined = config.get<string[]>('colors');
	if (colors === undefined) {
		console.log("Colors missing from config file.");

		return;
	}

	console.log(regexps.length + " regexps, " + colors.length + " colors");
	console.log(regexps);
	console.log(colors);

	let minPairs = Math.min(regexps.length, colors.length);

	if (minPairs === 0) {
		console.log("No colors to highlight with!");

		return;
	}

	// Clear current colors.
	highlightColors = [];

	for (let i = 0; i < minPairs; i++) {
		let info = new HighlightInfo(regexps[i], colors[i], "color_" + i);
		highlightColors.push(info);
	}

	console.log("highlightColors:");
	console.log(highlightColors);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "log-highlighter" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('log-highlighter.highlightFile', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Log Highlighter!');

		initializeInfo();
		updateDecorations();
	});

	context.subscriptions.push(disposable);

	// MJMJ following the code in here.
	// https://github.com/microsoft/vscode-extension-samples/blob/main/decorator-sample/src/extension.ts

	let timeout: NodeJS.Timer | undefined = undefined;

	const smallNumberDecorationType = vscode.window.createTextEditorDecorationType({
		borderWidth: '1px',
		borderStyle: 'solid',
		overviewRulerColor: 'blue',
		overviewRulerLane: vscode.OverviewRulerLane.Right,
		light: {
			// This color will be used in light color themes
			borderColor: 'darkblue'
		},
		dark: {
			// This color will be used in dark color themes
			borderColor: 'lightblue'
		}
	});

	const largeNumberDecorationType = vscode.window.createTextEditorDecorationType({
		cursor: 'crosshair',
		// Use a themeable color. See package.json for the declaration and default values.
		backgroundColor: {
			id: 'loghighlighter.color1'
		}

		// "colors": [
		// 	{
		// 		"id": "loghighlighter.color1",
		// 		"description": "Color 1",
		// 		"defaults": {
		// 			"dark": "#FF000055",
		// 			"light": "#FF000055",
		// 			"highContrast": "#FF000055"
		// 		}
		// 	}
		// ]
	});

	const fullLineDecorationType = vscode.window.createTextEditorDecorationType({
		cursor: 'crosshair',
		backgroundColor: {
			id: 'loghighlighter.color2'
		}
	});

	// let activeEditor = vscode.window.activeTextEditor;

	function updateDecorations() {
		let activeEditor = vscode.window.activeTextEditor;

		console.log("updateDecorations");
		if (!activeEditor) {
			return;
		}

		const regEx = /\d+/g;
		const text = activeEditor.document.getText();
		const smallNumbers: vscode.DecorationOptions[] = [];
		const largeNumbers: vscode.DecorationOptions[] = [];

		let match;
		while ((match = regEx.exec(text))) {
			const startPos = activeEditor.document.positionAt(match.index);
			const endPos = activeEditor.document.positionAt(match.index + match[0].length);
			const decoration = {
				range: new vscode.Range(startPos, endPos),
				hoverMessage: 'Number **' + match[0] + '**'
			};
			if (match[0].length < 3) {
				smallNumbers.push(decoration);
			} else {
				largeNumbers.push(decoration);
			}
		}

		let highlightMap = new Map<HighlightInfo, vscode.Range[]>();

		let i = 0;
		for (i = 0; i < activeEditor.document.lineCount; i++) {
			let line = activeEditor.document.lineAt(i);

			let highlightInfo = findHighlightInfo(line.text);

			if (highlightInfo !== null) {
				if (!highlightMap.has(highlightInfo)) {
					highlightMap.set(highlightInfo, []);
				}

				highlightMap.get(highlightInfo)?.push(line.range);
			}
		}

		console.log("small:");
		console.log(smallNumbers);
		console.log("large:");
		console.log(largeNumbers);
		console.log("highlight map:");
		console.log(highlightMap);

		// Set the decorations.
		for (let entry of highlightMap.entries()) {
			let decorationType = vscode.window.createTextEditorDecorationType({
				backgroundColor: entry[0].color
			});

			let decorations: vscode.DecorationOptions[] = [];

			for (let r of entry[1]) {
				decorations.push({
					range: r
				});
			}

			activeEditor.setDecorations(decorationType, decorations);
		}
	}

	// MJMJ want to change it so that it only updates when sending a command or if the file in the same
	// editor changes, don't want it to apply to all files when they are changed to.
	function triggerUpdateDecorations(throttle = false) {
		if (timeout) {
			clearTimeout(timeout);
			timeout = undefined;
		}

		if (throttle) {
			timeout = setTimeout(updateDecorations, 500);
		} else {
			updateDecorations();
		}
	}

	// if (activeEditor) {
	// 	triggerUpdateDecorations();
	// }

	// MJMJ If this is removed, then the highlighting doesn't automatically apply on a new file after first
	// activated on another file, but returning to the same file will remove the highlighting also.
	// vscode.window.onDidChangeActiveTextEditor(editor => {
	// 	activeEditor = editor;
	// 	if (editor) {
	// 		triggerUpdateDecorations();
	// 	}
	// }, null, context.subscriptions);

	// vscode.workspace.onDidChangeTextDocument(event => {
	// 	if (activeEditor && event.document === activeEditor.document) {
	// 		triggerUpdateDecorations(true);
	// 	}
	// }, null, context.subscriptions);
}

// this method is called when your extension is deactivated
export function deactivate() {}
