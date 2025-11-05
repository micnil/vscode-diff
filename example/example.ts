import { DefaultLinesDiffComputer, DiffComputer, IDiffComputerOpts, ILineChange, ILinesDiffComputerOptions } from '../dist';

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


let advOptions: ILinesDiffComputerOptions = {
	ignoreTrimWhitespace: true,
	computeMoves: true,
	maxComputationTimeMs: 0
}
let advDiffComputer = new DefaultLinesDiffComputer()
let advLineChanges = advDiffComputer.computeDiff(originalLines, modifiedLines, advOptions).changes;

console.log(JSON.stringify(advLineChanges, null, 2));
