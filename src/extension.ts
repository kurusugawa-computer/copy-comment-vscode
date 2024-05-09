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

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let cmd = vscode.commands.registerCommand('copy-comment-vscode.copy_without_comment_symbols', () => {
    const activeEditor = vscode.window.activeTextEditor;
    const doc = activeEditor && activeEditor.document;
    const ref = activeEditor?.selection;
    const selectedText = doc?.getText(ref).split('\n');
    const language = doc?.languageId;

    if (selectedText != undefined && language != undefined) {
      registry.loadGrammar('source.' + language).then((grammar: any) => {
        let ruleStack = vscodeTextmate.INITIAL;
        // loop every line
        for (let i = 0; i < selectedText.length; i++) {
          const line = selectedText[i];
          const lineTokens = grammar.tokenizeLine(line, ruleStack);
          let offset = 0;
          // loop every token
          for (let j = 0; j < lineTokens.tokens.length; j++) {
            const token = lineTokens.tokens[j];
            // detect and remove comment symbols
            console.log(
              ` - token from ${token.startIndex} to ${token.endIndex} ` +
                `(${line.substring(token.startIndex, token.endIndex)}) ` +
                `with scopes ${token.scopes.join(', ')}`
            );
            if (
              token.scopes.some((s: string) => {
                return s.includes('punctuation.definition.comment');
              }) ||
              (token.scopes.some((s: string) => {
                return s.includes('punctuation');
              }) &&
                token.scopes.some((s: string) => {
                  return s.includes('comment.block');
                }))
            ) {
              selectedText[i] =
                selectedText[i].substring(0, token.startIndex - offset) +
                selectedText[i].substring(token.endIndex - offset);
              offset += token.endIndex - token.startIndex;
            }
          }
          ruleStack = lineTokens.ruleStack;
        }
        // restruct text (add new-line character)
        const restructedText = restructText(selectedText);
        // copy to clipboard
        vscode.env.clipboard.writeText(restructedText);
        vscode.window.showInformationMessage('Copied without comment symbols!');
      });
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
