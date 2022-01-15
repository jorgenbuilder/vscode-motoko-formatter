import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {

	vscode.languages.registerDocumentFormattingEditProvider('motoko', {
		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
			const edits : vscode.TextEdit[] = [];
			if (vscode.workspace.getConfiguration('motokoFormatter').get('groupImports')) {
				const groupImports = sort(document);
				groupImports && edits.push(groupImports);
			}
			return edits;
		}
	});

	function sort(document?: vscode.TextDocument) : vscode.TextEdit | undefined {
		{
			const language = document?.languageId;
			if (language !== 'motoko') {
				return;
			}
			const body = document?.getText();
			if (!document || !body) { return; };
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
				if (match.includes('mo:base') || match.includes('mo:⛔') || match.includes('mo:prim')) {
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
			return new vscode.TextEdit(
				new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE),
				result,
			);
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
