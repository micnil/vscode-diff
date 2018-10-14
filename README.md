# vscode-diff
A small, zero-dependency text differencing library extracted from the open source [VS Code](https://github.com/Microsoft/vscode) editor.
The implementation is based on the difference algorithm described in "An O(ND) Difference Algorithm and its variations" by Eugene W. Myers.

The package includes typescript definitions.
## Installation
```bash
npm install vscode-diff --save
```
## Usage

## Contribute
Since we do not want this package to differ from the original implementation in VS Code, no changes that differs from the [source repository](https://github.com/Microsoft/vscode) will be merged. Any changes that only affect this npm package (like changes to this README) are welcome via pull requests. 

If you want to help keep the diff algorithm up to date, you'll find from which commit and what file the code comes from in the top of the file:

src/diffComputer.ts
```javascript
// Updated from commit 46d1426 - vscode/src/vs/editor/common/diff/diffComputer.ts
```
## Attribution
The source code of this package is directly extracted from the open source software VS Code, Copyright (c) Microsoft Corporation.

Only minor modifications have been made to the source files:
* Removed code unused by the diff implementation.
* Updated import paths to reflect their new location.
* Added comment in each source file with a commit hash from their last modification.
