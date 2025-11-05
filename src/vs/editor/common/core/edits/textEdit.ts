/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assertFn, checkAdjacentItems } from '../../../../base/common/assert.js';
import { Position } from '../position.js';
import { Range } from '../range.js';
import { AbstractText } from '../text/abstractText.js';
import { TextLength } from '../text/textLength.js';
import { StringReplacement } from './stringEdit.js';

export class TextEdit {
	constructor(
		public readonly replacements: readonly TextReplacement[]
	) {
		assertFn(() => checkAdjacentItems(replacements, (a, b) => a.range.getEndPosition().isBeforeOrEqual(b.range.getStartPosition())));
	}
	getNewRanges(): Range[] {
		const newRanges: Range[] = [];
		let previousEditEndLineNumber = 0;
		let lineOffset = 0;
		let columnOffset = 0;
		for (const replacement of this.replacements) {
			const textLength = TextLength.ofText(replacement.text);
			const newRangeStart = Position.lift({
				lineNumber: replacement.range.startLineNumber + lineOffset,
				column: replacement.range.startColumn + (replacement.range.startLineNumber === previousEditEndLineNumber ? columnOffset : 0)
			});
			const newRange = textLength.createRange(newRangeStart);
			newRanges.push(newRange);
			lineOffset = newRange.endLineNumber - replacement.range.endLineNumber;
			columnOffset = newRange.endColumn - replacement.range.endColumn;
			previousEditEndLineNumber = replacement.range.endLineNumber;
		}
		return newRanges;
	}
}

export class TextReplacement {


	public static fromStringReplacement(replacement: StringReplacement, initialState: AbstractText): TextReplacement {
		return new TextReplacement(initialState.getTransformer().getRange(replacement.replaceRange), replacement.newText);
	}



	constructor(
		public readonly range: Range,
		public readonly text: string,
	) {
	}



	static equals(first: TextReplacement, second: TextReplacement) {
		return first.range.equalsRange(second.range) && first.text === second.text;
	}





	public equals(other: TextReplacement): boolean {
		return TextReplacement.equals(this, other);
	}

	public extendToCoverRange(range: Range, initialValue: AbstractText): TextReplacement {
		if (this.range.containsRange(range)) { return this; }

		const newRange = this.range.plusRange(range);
		const textBefore = initialValue.getValueOfRange(Range.fromPositions(newRange.getStartPosition(), this.range.getStartPosition()));
		const textAfter = initialValue.getValueOfRange(Range.fromPositions(this.range.getEndPosition(), newRange.getEndPosition()));
		const newText = textBefore + this.text + textAfter;
		return new TextReplacement(newRange, newText);
	}
}

