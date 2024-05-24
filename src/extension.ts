import { readFile, readFileSync } from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import * as oniguruma from 'vscode-oniguruma';
import * as vscodeTextmate from 'vscode-textmate';

function readGrammarFile(filePath: string) {
  return new Promise((resolve, reject) => {
    readFile(filePath, (error: any, data: any) => (error ? reject(error) : resolve(data)));
  });
}

const wasmBin = readFileSync(path.join(__dirname, '../node_modules/vscode-oniguruma/release/onig.wasm')).buffer;
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
    const fileName = scopeName.split('.')[1] + '.xml';
    return readGrammarFile(path.join(__dirname, '../resources/', fileName)).then((data: any) =>
      vscodeTextmate.parseRawGrammar(data.toString())
    );
  },
});

export async function activate(context: vscode.ExtensionContext) {
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

        // restructure text (add new-line character)
        const restructuredText = restructureText(selectedText);

        // copy to clipboard
        vscode.env.clipboard.writeText(restructuredText);
        vscode.window.showInformationMessage('Copied without comment symbols!');
      });
    } else {
      vscode.window.showErrorMessage('Failed to get document');
    }
  });

  context.subscriptions.push(cmd);
}

function restructureText(lines: string[]): string {
  let result = '';
  for (let i = 0; i < lines.length; i++) {
    result += lines[i] + '\n';
  }
  return result;
}
