/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BugIndicatingError } from '../../../../base/common/errors.js';

interface IOffsetRange {
	readonly start: number;
	readonly endExclusive: number;
}

/**
 * A range of offsets (0-based).
*/
export class OffsetRange implements IOffsetRange {

	public static ofLength(length: number): OffsetRange {
		return new OffsetRange(0, length);
	}

	public static ofStartAndLength(start: number, length: number): OffsetRange {
		return new OffsetRange(start, start + length);
	}

	public static emptyAt(offset: number): OffsetRange {
		return new OffsetRange(offset, offset);
	}

	constructor(public readonly start: number, public readonly endExclusive: number) {
		if (start > endExclusive) {
			throw new BugIndicatingError(`Invalid range: ${this.toString()}`);
		}
	}

	get isEmpty(): boolean {
		return this.start === this.endExclusive;
	}

	public delta(offset: number): OffsetRange {
		return new OffsetRange(this.start + offset, this.endExclusive + offset);
	}

	public deltaStart(offset: number): OffsetRange {
		return new OffsetRange(this.start + offset, this.endExclusive);
	}

	public deltaEnd(offset: number): OffsetRange {
		return new OffsetRange(this.start, this.endExclusive + offset);
	}

	public get length(): number {
		return this.endExclusive - this.start;
	}

	public toString() {
		return `[${this.start}, ${this.endExclusive})`;
	}

	public equals(other: OffsetRange): boolean {
		return this.start === other.start && this.endExclusive === other.endExclusive;
	}





	/**
	 * for all numbers n: range1.contains(n) or range2.contains(n) => range1.join(range2).contains(n)
	 * The joined range is the smallest range that contains both ranges.
	 */
	public join(other: OffsetRange): OffsetRange {
		return new OffsetRange(Math.min(this.start, other.start), Math.max(this.endExclusive, other.endExclusive));
	}

	/**
	 * for all numbers n: range1.contains(n) and range2.contains(n) <=> range1.intersect(range2).contains(n)
	 *
	 * The resulting range is empty if the ranges do not intersect, but touch.
	 * If the ranges don't even touch, the result is undefined.
	 */
	public intersect(other: OffsetRange): OffsetRange | undefined {
		const start = Math.max(this.start, other.start);
		const end = Math.min(this.endExclusive, other.endExclusive);
		if (start <= end) {
			return new OffsetRange(start, end);
		}
		return undefined;
	}



	public intersects(other: OffsetRange): boolean {
		const start = Math.max(this.start, other.start);
		const end = Math.min(this.endExclusive, other.endExclusive);
		return start < end;
	}

	public intersectsOrTouches(other: OffsetRange): boolean {
		const start = Math.max(this.start, other.start);
		const end = Math.min(this.endExclusive, other.endExclusive);
		return start <= end;
	}





	public slice<T>(arr: readonly T[]): T[] {
		return arr.slice(this.start, this.endExclusive);
	}

	public substring(str: string): string {
		return str.substring(this.start, this.endExclusive);
	}

	public forEach(f: (offset: number) => void): void {
		for (let i = this.start; i < this.endExclusive; i++) {
			f(i);
		}
	}

	/**
	 * this: [ 5, 10), range: [10, 15) => [5, 15)]
	 * Throws if the ranges are not touching.
	*/
	public joinRightTouching(range: OffsetRange): OffsetRange {
		if (this.endExclusive !== range.start) {
			throw new BugIndicatingError(`Invalid join: ${this.toString()} and ${range.toString()}`);
		}
		return new OffsetRange(this.start, range.endExclusive);
	}
}

export class OffsetRangeSet {
	private readonly _sortedRanges: OffsetRange[] = [];

	public get ranges(): OffsetRange[] {
		return [...this._sortedRanges];
	}

	public addRange(range: OffsetRange): void {
		let i = 0;
		while (i < this._sortedRanges.length && this._sortedRanges[i].endExclusive < range.start) {
			i++;
		}
		let j = i;
		while (j < this._sortedRanges.length && this._sortedRanges[j].start <= range.endExclusive) {
			j++;
		}
		if (i === j) {
			this._sortedRanges.splice(i, 0, range);
		} else {
			const start = Math.min(range.start, this._sortedRanges[i].start);
			const end = Math.max(range.endExclusive, this._sortedRanges[j - 1].endExclusive);
			this._sortedRanges.splice(i, j - i, new OffsetRange(start, end));
		}
	}

	public toString(): string {
		return this._sortedRanges.map(r => r.toString()).join(', ');
	}

	/**
	 * Returns of there is a value that is contained in this instance and the given range.
	 */
	public intersectsStrict(other: OffsetRange): boolean {
		// TODO use binary search
		let i = 0;
		while (i < this._sortedRanges.length && this._sortedRanges[i].endExclusive <= other.start) {
			i++;
		}
		return i < this._sortedRanges.length && this._sortedRanges[i].start < other.endExclusive;
	}

	public intersectWithRange(other: OffsetRange): OffsetRangeSet {
		// TODO use binary search + slice
		const result = new OffsetRangeSet();
		for (const range of this._sortedRanges) {
			const intersection = range.intersect(other);
			if (intersection) {
				result.addRange(intersection);
			}
		}
		return result;
	}

	public intersectWithRangeLength(other: OffsetRange): number {
		return this.intersectWithRange(other).length;
	}

	public get length(): number {
		return this._sortedRanges.reduce((prev, cur) => prev + cur.length, 0);
	}
}
