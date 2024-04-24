// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "hello" is now active!');

  let userLanguage = vscode.env.language;
  console.log(userLanguage);
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let cmd = vscode.commands.registerCommand('hello.copy_without_comment_marks', () => {
    const activeEditor = vscode.window.activeTextEditor;
    const doc = activeEditor && activeEditor.document;
    // 選択範囲を取得
    const ref = activeEditor?.selection;
    const str = doc?.getText(ref);
    if (str != undefined && str != '') {
      // コピーしたテキストからコメント記号を取り除く
      vscode.env.clipboard.writeText(str);
      vscode.window.showInformationMessage(str);
    } else {
      vscode.window.showInformationMessage('コピー対象の文字列が空または選択されていません。');
    }
  });

  context.subscriptions.push(cmd);
}

// This method is called when your extension is deactivated
export function deactivate() {}
