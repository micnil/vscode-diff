/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { findFirstIdxMonotonousOrArrLen, findLastIdxMonotonous, findLastMonotonous } from '../../../../base/common/arraysFind.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { Range } from '../range.js';
import { OffsetRange } from './offsetRange.js';

/**
 * A range of lines (1-based).
 */
export class LineRange {

	/**
	 * The start line number.
	 */
	public readonly startLineNumber: number;

	/**
	 * The end line number (exclusive).
	 */
	public readonly endLineNumberExclusive: number;

	constructor(
		startLineNumber: number,
		endLineNumberExclusive: number,
	) {
		if (startLineNumber > endLineNumberExclusive) {
			throw new BugIndicatingError(`startLineNumber ${startLineNumber} cannot be after endLineNumberExclusive ${endLineNumberExclusive}`);
		}
		this.startLineNumber = startLineNumber;
		this.endLineNumberExclusive = endLineNumberExclusive;
	}

	/**
	 * Indicates if this line range is empty.
	 */
	get isEmpty(): boolean {
		return this.startLineNumber === this.endLineNumberExclusive;
	}

	/**
	 * Moves this line range by the given offset of line numbers.
	 */
	public delta(offset: number): LineRange {
		return new LineRange(this.startLineNumber + offset, this.endLineNumberExclusive + offset);
	}



	/**
	 * The number of lines this line range spans.
	 */
	public get length(): number {
		return this.endLineNumberExclusive - this.startLineNumber;
	}

	/**
	 * Creates a line range that combines this and the given line range.
	 */
	public join(other: LineRange): LineRange {
		return new LineRange(
			Math.min(this.startLineNumber, other.startLineNumber),
			Math.max(this.endLineNumberExclusive, other.endLineNumberExclusive)
		);
	}



	/**
	 * The resulting range is empty if the ranges do not intersect, but touch.
	 * If the ranges don't even touch, the result is undefined.
	 */
	public intersect(other: LineRange): LineRange | undefined {
		const startLineNumber = Math.max(this.startLineNumber, other.startLineNumber);
		const endLineNumberExclusive = Math.min(this.endLineNumberExclusive, other.endLineNumberExclusive);
		if (startLineNumber <= endLineNumberExclusive) {
			return new LineRange(startLineNumber, endLineNumberExclusive);
		}
		return undefined;
	}



	public intersectsOrTouches(other: LineRange): boolean {
		return this.startLineNumber <= other.endLineNumberExclusive && other.startLineNumber <= this.endLineNumberExclusive;
	}



	public toInclusiveRange(): Range | null {
		if (this.isEmpty) {
			return null;
		}
		return new Range(this.startLineNumber, 1, this.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER);
	}
	/**
	 * Converts this 1-based line range to a 0-based offset range (subtracts 1!).
	 * @internal
	 */
	public toOffsetRange(): OffsetRange {
		return new OffsetRange(this.startLineNumber - 1, this.endLineNumberExclusive - 1);
	}
}


export class LineRangeSet {
	constructor(
		/**
		 * Sorted by start line number.
		 * No two line ranges are touching or intersecting.
		 */
		private readonly _normalizedRanges: LineRange[] = []
	) {
	}

	get ranges(): readonly LineRange[] {
		return this._normalizedRanges;
	}

	addRange(range: LineRange): void {
		if (range.length === 0) {
			return;
		}

		// Idea: Find joinRange such that:
		// replaceRange = _normalizedRanges.replaceRange(joinRange, range.joinAll(joinRange.map(idx => this._normalizedRanges[idx])))

		// idx of first element that touches range or that is after range
		const joinRangeStartIdx = findFirstIdxMonotonousOrArrLen(this._normalizedRanges, r => r.endLineNumberExclusive >= range.startLineNumber);
		// idx of element after { last element that touches range or that is before range }
		const joinRangeEndIdxExclusive = findLastIdxMonotonous(this._normalizedRanges, r => r.startLineNumber <= range.endLineNumberExclusive) + 1;

		if (joinRangeStartIdx === joinRangeEndIdxExclusive) {
			// If there is no element that touches range, then joinRangeStartIdx === joinRangeEndIdxExclusive and that value is the index of the element after range
			this._normalizedRanges.splice(joinRangeStartIdx, 0, range);
		} else if (joinRangeStartIdx === joinRangeEndIdxExclusive - 1) {
			// Else, there is an element that touches range and in this case it is both the first and last element. Thus we can replace it
			const joinRange = this._normalizedRanges[joinRangeStartIdx];
			this._normalizedRanges[joinRangeStartIdx] = joinRange.join(range);
		} else {
			// First and last element are different - we need to replace the entire range
			const joinRange = this._normalizedRanges[joinRangeStartIdx].join(this._normalizedRanges[joinRangeEndIdxExclusive - 1]).join(range);
			this._normalizedRanges.splice(joinRangeStartIdx, joinRangeEndIdxExclusive - joinRangeStartIdx, joinRange);
		}
	}

	contains(lineNumber: number): boolean {
		const rangeThatStartsBeforeEnd = findLastMonotonous(this._normalizedRanges, r => r.startLineNumber <= lineNumber);
		return !!rangeThatStartsBeforeEnd && rangeThatStartsBeforeEnd.endLineNumberExclusive > lineNumber;
	}

	/**
	 * Subtracts all ranges in this set from `range` and returns the result.
	 */
	subtractFrom(range: LineRange): LineRangeSet {
		// idx of first element that touches range or that is after range
		const joinRangeStartIdx = findFirstIdxMonotonousOrArrLen(this._normalizedRanges, r => r.endLineNumberExclusive >= range.startLineNumber);
		// idx of element after { last element that touches range or that is before range }
		const joinRangeEndIdxExclusive = findLastIdxMonotonous(this._normalizedRanges, r => r.startLineNumber <= range.endLineNumberExclusive) + 1;

		if (joinRangeStartIdx === joinRangeEndIdxExclusive) {
			return new LineRangeSet([range]);
		}

		const result: LineRange[] = [];
		let startLineNumber = range.startLineNumber;
		for (let i = joinRangeStartIdx; i < joinRangeEndIdxExclusive; i++) {
			const r = this._normalizedRanges[i];
			if (r.startLineNumber > startLineNumber) {
				result.push(new LineRange(startLineNumber, r.startLineNumber));
			}
			startLineNumber = r.endLineNumberExclusive;
		}
		if (startLineNumber < range.endLineNumberExclusive) {
			result.push(new LineRange(startLineNumber, range.endLineNumberExclusive));
		}

		return new LineRangeSet(result);
	}

	getIntersection(other: LineRangeSet): LineRangeSet {
		const result: LineRange[] = [];

		let i1 = 0;
		let i2 = 0;
		while (i1 < this._normalizedRanges.length && i2 < other._normalizedRanges.length) {
			const r1 = this._normalizedRanges[i1];
			const r2 = other._normalizedRanges[i2];

			const i = r1.intersect(r2);
			if (i && !i.isEmpty) {
				result.push(i);
			}

			if (r1.endLineNumberExclusive < r2.endLineNumberExclusive) {
				i1++;
			} else {
				i2++;
			}
		}

		return new LineRangeSet(result);
	}

	getWithDelta(value: number): LineRangeSet {
		return new LineRangeSet(this._normalizedRanges.map(r => r.delta(value)));
	}
}
