# vscode-diff
A small, zero-dependency text differencing library extracted from the open source [VS Code](https://github.com/Microsoft/vscode) editor.
The implementation is based on the difference algorithm described in "An O(ND) Difference Algorithm and its variations" by Eugene W. Myers.

The package includes typescript definitions.

![npm](https://img.shields.io/npm/v/vscode-diff?style=plastic)
![GitHub](https://img.shields.io/github/license/micnil/vscode-diff)
## Installation
```bash
npm install vscode-diff --save
```
## Usage

Starting from version 1.71.0 VS Code introduced new diffing algorithm that can also detect code moves. It is currently used by default in VS Code and can be accessed in this library as `AdvancedLinesDiffComputer`.
The legacy algorithm can be accessed as `DiffComputer`.

### Example of legacy algorithm usage:

```typescript
import { DiffComputer, IDiffComputerOpts, ILineChange } from 'vscode-diff';

let originalLines: string[] = ["hello", "original", "world"];
let modifiedLines: string[] = ["hello", "modified", "world", "foobar"];
let options: IDiffComputerOpts = {
  shouldPostProcessCharChanges: true,
  shouldIgnoreTrimWhitespace: true,
  shouldMakePrettyDiff: true,
  shouldComputeCharChanges: true,
  maxComputationTime: 0 // time in milliseconds, 0 => no computation limit.
}
let diffComputer = new DiffComputer(originalLines, modifiedLines, options);
let lineChanges: ILineChange[] = diffComputer.computeDiff().changes;

console.log(JSON.stringify(lineChanges, null, 2));
```
Output:
```json
[
  {
    "originalStartLineNumber": 2,
    "originalEndLineNumber": 2,
    "modifiedStartLineNumber": 2,
    "modifiedEndLineNumber": 2,
    "charChanges": [
      {
        "originalStartLineNumber": 2,
        "originalStartColumn": 1,
        "originalEndLineNumber": 2,
        "originalEndColumn": 9,
        "modifiedStartLineNumber": 2,
        "modifiedStartColumn": 1,
        "modifiedEndLineNumber": 2,
        "modifiedEndColumn": 9
      }
    ]
  },
  {
    "originalStartLineNumber": 3,
    "originalEndLineNumber": 0,
    "modifiedStartLineNumber": 4,
    "modifiedEndLineNumber": 4
  }
]
```
Each element in the produced `lineChanges` array corresponds to a change from the original lines to the modified lines.

The column and row indices are 1-based. If a 0 index is present, it means that a row has been added/removed, eg:
```json
{
  "originalStartLineNumber": 3,
  "originalEndLineNumber": 0,
  "modifiedStartLineNumber": 4,
  "modifiedEndLineNumber": 4
}
```
means that the 4th line in the modified text was added after line 3 in the original text.

The opposite:
```json
{
  "originalStartLineNumber": 4,
  "originalEndLineNumber": 4,
  "modifiedStartLineNumber": 3,
  "modifiedEndLineNumber": 0
}
```
means that the 4th line in the original text was removed from after line 3 in the modified text.

### Example of new algorithm usage:
```typescript
let advOptions: ILinesDiffComputerOptions = {
    ignoreTrimWhitespace: true,
    computeMoves: true,
    maxComputationTimeMs: 0
}
let advDiffComputer = new AdvancedLinesDiffComputer()
let advLineChanges = advDiffComputer.computeDiff(originalLines, modifiedLines, advOptions).changes;

console.log(JSON.stringify(advLineChanges, null, 2));
```

Output:
```json
[
  {
    "originalRange": {
      "startLineNumber": 2,
      "endLineNumberExclusive": 3
    },
    "modifiedRange": {
      "startLineNumber": 2,
      "endLineNumberExclusive": 3
    },
    "innerChanges": [
      {
        "originalRange": {
          "startLineNumber": 2,
          "startColumn": 1,
          "endLineNumber": 2,
          "endColumn": 9
        },
        "modifiedRange": {
          "startLineNumber": 2,
          "startColumn": 1,
          "endLineNumber": 2,
          "endColumn": 9
        }
      }
    ]
  },
  {
    "originalRange": {
      "startLineNumber": 4,
      "endLineNumberExclusive": 4
    },
    "modifiedRange": {
      "startLineNumber": 4,
      "endLineNumberExclusive": 5
    },
    "innerChanges": [
      {
        "originalRange": {
          "startLineNumber": 3,
          "startColumn": 6,
          "endLineNumber": 3,
          "endColumn": 6
        },
        "modifiedRange": {
          "startLineNumber": 3,
          "startColumn": 6,
          "endLineNumber": 4,
          "endColumn": 7
        }
      }
    ]
  }
]
```

The format of the result mapping is similar to that returned by `DiffComputer` but beware that then ending line number in line range is exclusive, e.g.
```json
"originalRange": {
  "startLineNumber": 2,
  "endLineNumberExclusive": 3
}
```

as opposed to
```json
"originalStartLineNumber": 2,
"originalEndLineNumber": 2,
```


## Changelog

### 2.1.1
* Fix build errors in 2.1.0 [#3](https://github.com/micnil/vscode-diff/issues/3)

### 2.1.0
* Update to VS Code 1.82.1 that introduces new diffing algorithm `AdvancedLinesDiffComputer`.

### 2.0.2
* Fix issue [121436](https://github.com/microsoft/vscode/issues/121436)

### 2.0.1
* Fix missing typescript types
* Fix issue [119051](https://github.com/microsoft/vscode/issues/119051)

### 2.0.0
 * New DiffComputer option: maxComputationTime. Specify maximum time that the diff computer should run. Specify 0 for no limit. For character changes (`charChanges`) there is a new hard coded maximum limit of 5 seconds.
 * New return type from diffComputer:
 ```
 interface IDiffComputerResult {
	quitEarly: boolean;
	changes: ILineChange[];
}
 ```

### 1.0.0
Initial release

## Contribute
Since we do not want this package to differ from the original implementation in VS Code, no changes that differs from the [source repository](https://github.com/Microsoft/vscode) will be merged. Any changes that only affect this npm package (like changes to this README) are welcome via pull requests.

Steps for updating diff algorithm:
* Copy all necessary files from VS Code repo.
* Verify with `npm run build` that all code is self-contained.
* Verify with `npm run knip` that there are no unused files or exports.
* Run `npm test` to run all the tests.
* Update [example/example.ts] on any API changes.
* Run `npm run example` and update this README with example usage code and output.
* Include VS Code version and commit hash in commit message.

Any help documenting the diff API is very welcome.

## Attribution
The source code of this package is directly extracted from the open source software VS Code, Copyright (c) Microsoft Corporation.
The VS Code source files is licensed under the MIT license. See src/LICENSE.txt for additional details.

Only minor modifications have been made to the source files:
* Removed code unused by the diff implementation.
* Updated import paths to reflect their new location.
* Added comment in each source file with a commit hash from their last modification.

I am in no way affiliated to Microsoft or the VS Code team.
