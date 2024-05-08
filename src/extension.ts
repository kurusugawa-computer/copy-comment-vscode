// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';
import * as vscodeTextmate from 'vscode-textmate';
import * as oniguruma from 'vscode-oniguruma';

function readFile(path: string) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (error: any, data: any) => (error ? reject(error) : resolve(data)));
  });
}

const wasmBin = fs.readFileSync(path.join(__dirname, '../node_modules/vscode-oniguruma/release/onig.wasm')).buffer;
const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
  return {
    createOnigScanner(patterns: any) {
      return new oniguruma.OnigScanner(patterns);
    },
    createOnigString(s: any) {
      return new oniguruma.OnigString(s);
    },
  };
});

const registry = new vscodeTextmate.Registry({
  onigLib: vscodeOnigurumaLib,
  loadGrammar: (scopeName: string) => {
    // https://github.com/textmate/
    const fileName = scopeName.split('.')[1] + '.xml';
    return readFile(path.join(__dirname, '../resources/', fileName)).then((data: any) =>
      vscodeTextmate.parseRawGrammar(data.toString())
    );
  },
});

// Map to convert languageId to scopeName in grammar
const languageIdMap = new Map<string, string>([
  ['javascript', 'js'],
  ['python', 'python'],
]);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let cmd = vscode.commands.registerCommand('copy-comment-vscode.copy_without_comment_marks', () => {
    const activeEditor = vscode.window.activeTextEditor;
    const doc = activeEditor && activeEditor.document;
    const ref = activeEditor?.selection;
    const selectedText = doc?.getText(ref).split('\n');
    const language = doc?.languageId;

    if (selectedText != undefined && language != undefined) {
      const extension = languageIdMap.get(language);
      registry.loadGrammar('source.' + extension).then((grammar: any) => {
        let ruleStack = vscodeTextmate.INITIAL;
        for (let i = 0; i < selectedText.length; i++) {
          const line = selectedText[i];
          const lineTokens = grammar.tokenizeLine(line, ruleStack);
          console.log(`\nTokenizing line: ${line}`);
          for (let j = 0; j < lineTokens.tokens.length; j++) {
            const token = lineTokens.tokens[j];
            console.log(
              ` - token from ${token.startIndex} to ${token.endIndex} ` +
                `(${line.substring(token.startIndex, token.endIndex)}) ` +
                `with scopes ${token.scopes.join(', ')}`
            );
          }
          ruleStack = lineTokens.ruleStack;
        }
      });
      // Remove comment marks

      // Restruct Text (Add new-line character)
      const restructedText = restructText(selectedText);

      // Copy to clipboard
      vscode.env.clipboard.writeText(restructedText);
    } else {
      vscode.window.showErrorMessage('Failed to get document');
    }
  });

  context.subscriptions.push(cmd);
}

function restructText(str: string[]): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += str[i] + '\n';
  }
  return result;
}

// This method is called when your extension is deactivated
export function deactivate() {}
