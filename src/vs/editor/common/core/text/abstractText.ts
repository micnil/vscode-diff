/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assert } from '../../../../base/common/assert.js';
import { Range } from '../range.js';
import { TextLength } from '../text/textLength.js';

export abstract class AbstractText {
	abstract getValueOfRange(range: Range): string;
	abstract readonly length: TextLength;

	getLineLength(lineNumber: number): number {
		return this.getValueOfRange(new Range(lineNumber, 1, lineNumber, Number.MAX_SAFE_INTEGER)).length;
	}


}

class LineBasedText extends AbstractText {
	constructor(
		private readonly _getLineContent: (lineNumber: number) => string,
		private readonly _lineCount: number
	) {
		assert(_lineCount >= 1);

		super();
	}

	override getValueOfRange(range: Range): string {
		if (range.startLineNumber === range.endLineNumber) {
			return this._getLineContent(range.startLineNumber).substring(range.startColumn - 1, range.endColumn - 1);
		}
		let result = this._getLineContent(range.startLineNumber).substring(range.startColumn - 1);
		for (let i = range.startLineNumber + 1; i < range.endLineNumber; i++) {
			result += '\n' + this._getLineContent(i);
		}
		result += '\n' + this._getLineContent(range.endLineNumber).substring(0, range.endColumn - 1);
		return result;
	}

	override getLineLength(lineNumber: number): number {
		return this._getLineContent(lineNumber).length;
	}

	get length(): TextLength {
		const lastLine = this._getLineContent(this._lineCount);
		return new TextLength(this._lineCount - 1, lastLine.length);
	}
}

export class ArrayText extends LineBasedText {
	constructor(lines: string[]) {
		super(
			lineNumber => lines[lineNumber - 1],
			lines.length
		);
	}
}