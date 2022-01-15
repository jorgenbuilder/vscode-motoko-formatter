// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	function sort(document?: vscode.TextDocument) {
		{
			const language = document?.languageId;
			if (language !== 'motoko') {
				return;
			}
			const body = document?.getText();
			if (!body) { return; };
			// Get import lines (top of file, has "Import", delete blank lines and comments)
			const reg = /import.+/g;
			const imports : { [key : string] : string[]} = {
				unsorted: [],
				base: [],
				thirdParty: [],
				project: [],
				module: [],
			};
			let match;
			let start = undefined;
			let end = 0;
			while((match = reg.exec(body)) !== null) {
				if (start === undefined) { start = match.index; }
				end = match.index + match.toString().length;
				imports.unsorted.push(match.toString());
			}
			if (start === undefined) { return; };
			imports.unsorted = imports.unsorted.sort(function(a, b){
				if(a < b) { return -1; }
				if(a > b) { return 1; }
				return 0;
			});
			while (imports.unsorted.length) {
				const match = imports.unsorted.shift() as string;
				if (match.includes('mo:base')) {
					imports.base.push(match);
				} else if (match.includes('mo:')) {
					imports.thirdParty.push(match);
				} else {
					imports.project.push(match);
				}
			};
			const before = body.substring(0, start);
			const after = body.substring(end);
			let importString = '';
			if (imports.base.length > 0) {
				importString += imports.base.join('\n');
			}
			if (imports.thirdParty.length > 0) {
				importString += (importString.length ? '\n\n' : '') + imports.thirdParty.join('\n');
			}
			if (imports.project.length > 0) {
				importString += (importString.length ? '\n\n' : '') + imports.project.join('\n');
			}
			if (imports.module.length > 0) {
				importString += (importString.length ? '\n\n' : '') + imports.module.join('\n');
			}
			let result = `${before}${importString}${after}`;
			return vscode.window.activeTextEditor?.edit((edit) => {
				edit.replace(
					new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE),
					result
				);
			});
		}
	};

	async function listener({ document, waitUntil }: vscode.TextDocumentWillSaveEvent) {
		await sort(document);
	}

	vscode.workspace.onWillSaveTextDocument(listener);

	let disposable = vscode.commands.registerCommand('motoko-import-sort.sort', () => sort(vscode.window.activeTextEditor?.document));

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
