import { DefaultLinesDiffComputer, DiffComputer, IDiffComputerOpts, ILineChange, ILinesDiffComputerOptions } from '../dist';

const originalLines: string[] = ["hello", "original", "world"];
const modifiedLines: string[] = ["hello", "modified", "world", "foobar"];
const options: IDiffComputerOpts = {
	shouldPostProcessCharChanges: true,
	shouldIgnoreTrimWhitespace: true,
	shouldMakePrettyDiff: true,
	shouldComputeCharChanges: true,
	maxComputationTime: 0 // time in milliseconds, 0 => no computation limit.
}
const diffComputer = new DiffComputer(originalLines, modifiedLines, options);
const lineChanges: ILineChange[] = diffComputer.computeDiff().changes;

console.log(JSON.stringify(lineChanges, null, 2));


const defaultOptions: ILinesDiffComputerOptions = {
	ignoreTrimWhitespace: true,
	computeMoves: true,
	maxComputationTimeMs: 0
}
const defaultDiffComputer = new DefaultLinesDiffComputer()
const defaultLineChanges = defaultDiffComputer.computeDiff(originalLines, modifiedLines, defaultOptions).changes;

console.log(JSON.stringify(defaultLineChanges, null, 2));
