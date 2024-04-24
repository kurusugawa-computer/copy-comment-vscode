// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let cmd = vscode.commands.registerCommand('copy-comment-vscode.copy_without_comment_marks', () => {
    // Get text in selection
    const activeEditor = vscode.window.activeTextEditor;
    const doc = activeEditor && activeEditor.document;
    const ref = activeEditor?.selection;
    let str = doc?.getText(ref);
    if (str != undefined && str != '') {
      // Remove copy symbol

      // Copy to clipboard
      vscode.env.clipboard.writeText(str);
    } else {
      vscode.window.showErrorMessage('No string selected to copy');
    }
  });

  context.subscriptions.push(cmd);
}

// This method is called when your extension is deactivated
export function deactivate() {}
