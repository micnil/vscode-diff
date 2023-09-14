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
