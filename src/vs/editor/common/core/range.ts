/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IPosition, Position } from './position.js';

/**
 * A range in the editor. This interface is suitable for serialization.
 */
export interface IRange {
	/**
	 * Line number on which the range starts (starts at 1).
	 */
	readonly startLineNumber: number;
	/**
	 * Column on which the range starts in line `startLineNumber` (starts at 1).
	 */
	readonly startColumn: number;
	/**
	 * Line number on which the range ends.
	 */
	readonly endLineNumber: number;
	/**
	 * Column on which the range ends in line `endLineNumber`.
	 */
	readonly endColumn: number;
}

/**
 * A range in the editor. (startLineNumber,startColumn) is <= (endLineNumber,endColumn)
 */
export class Range {

	/**
	 * Line number on which the range starts (starts at 1).
	 */
	public readonly startLineNumber: number;
	/**
	 * Column on which the range starts in line `startLineNumber` (starts at 1).
	 */
	public readonly startColumn: number;
	/**
	 * Line number on which the range ends.
	 */
	public readonly endLineNumber: number;
	/**
	 * Column on which the range ends in line `endLineNumber`.
	 */
	public readonly endColumn: number;

	constructor(startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number) {
		if ((startLineNumber > endLineNumber) || (startLineNumber === endLineNumber && startColumn > endColumn)) {
			this.startLineNumber = endLineNumber;
			this.startColumn = endColumn;
			this.endLineNumber = startLineNumber;
			this.endColumn = startColumn;
		} else {
			this.startLineNumber = startLineNumber;
			this.startColumn = startColumn;
			this.endLineNumber = endLineNumber;
			this.endColumn = endColumn;
		}
	}

	/**
	 * Test if this range is empty.
	 */
	

	/**
	 * Test if `range` is empty.
	 */
	public static isEmpty(range: IRange): boolean {
		return (range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn);
	}

	/**
	 * Test if position is in this range. If the position is at the edges, will return true.
	 */
	

	/**
	 * Test if `position` is in `range`. If the position is at the edges, will return true.
	 */
	

	/**
	 * Test if `position` is in `range`. If the position is at the edges, will return false.
	 * @internal
	 */
	

	/**
	 * Test if range is in this range. If the range is equal to this range, will return true.
	 */
	public containsRange(range: IRange): boolean {
		return Range.containsRange(this, range);
	}

	/**
	 * Test if `otherRange` is in `range`. If the ranges are equal, will return true.
	 */
	public static containsRange(range: IRange, otherRange: IRange): boolean {
		if (otherRange.startLineNumber < range.startLineNumber || otherRange.endLineNumber < range.startLineNumber) {
			return false;
		}
		if (otherRange.startLineNumber > range.endLineNumber || otherRange.endLineNumber > range.endLineNumber) {
			return false;
		}
		if (otherRange.startLineNumber === range.startLineNumber && otherRange.startColumn < range.startColumn) {
			return false;
		}
		if (otherRange.endLineNumber === range.endLineNumber && otherRange.endColumn > range.endColumn) {
			return false;
		}
		return true;
	}

	/**
	 * Test if `range` is strictly in this range. `range` must start after and end before this range for the result to be true.
	 */
	

	/**
	 * Test if `otherRange` is strictly in `range` (must start after, and end before). If the ranges are equal, will return false.
	 */
	

	/**
	 * A reunion of the two ranges.
	 * The smallest position will be used as the start point, and the largest one as the end point.
	 */
	public plusRange(range: IRange): Range {
		return Range.plusRange(this, range);
	}

	/**
	 * A reunion of the two ranges.
	 * The smallest position will be used as the start point, and the largest one as the end point.
	 */
	public static plusRange(a: IRange, b: IRange): Range {
		let startLineNumber: number;
		let startColumn: number;
		let endLineNumber: number;
		let endColumn: number;

		if (b.startLineNumber < a.startLineNumber) {
			startLineNumber = b.startLineNumber;
			startColumn = b.startColumn;
		} else if (b.startLineNumber === a.startLineNumber) {
			startLineNumber = b.startLineNumber;
			startColumn = Math.min(b.startColumn, a.startColumn);
		} else {
			startLineNumber = a.startLineNumber;
			startColumn = a.startColumn;
		}

		if (b.endLineNumber > a.endLineNumber) {
			endLineNumber = b.endLineNumber;
			endColumn = b.endColumn;
		} else if (b.endLineNumber === a.endLineNumber) {
			endLineNumber = b.endLineNumber;
			endColumn = Math.max(b.endColumn, a.endColumn);
		} else {
			endLineNumber = a.endLineNumber;
			endColumn = a.endColumn;
		}

		return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
	}

	/**
	 * A intersection of the two ranges.
	 */
	

	/**
	 * A intersection of the two ranges.
	 */
	

	/**
	 * Test if this range equals other.
	 */
	public equalsRange(other: IRange | null | undefined): boolean {
		return Range.equalsRange(this, other);
	}

	/**
	 * Test if range `a` equals `b`.
	 */
	public static equalsRange(a: IRange | null | undefined, b: IRange | null | undefined): boolean {
		if (!a && !b) {
			return true;
		}
		return (
			!!a &&
			!!b &&
			a.startLineNumber === b.startLineNumber &&
			a.startColumn === b.startColumn &&
			a.endLineNumber === b.endLineNumber &&
			a.endColumn === b.endColumn
		);
	}

	/**
	 * Return the end position (which will be after or equal to the start position)
	 */
	public getEndPosition(): Position {
		return Range.getEndPosition(this);
	}

	/**
	 * Return the end position (which will be after or equal to the start position)
	 */
	public static getEndPosition(range: IRange): Position {
		return new Position(range.endLineNumber, range.endColumn);
	}

	/**
	 * Return the start position (which will be before or equal to the end position)
	 */
	public getStartPosition(): Position {
		return Range.getStartPosition(this);
	}

	/**
	 * Return the start position (which will be before or equal to the end position)
	 */
	public static getStartPosition(range: IRange): Position {
		return new Position(range.startLineNumber, range.startColumn);
	}

	/**
	 * Transform to a user presentable string representation.
	 */
	

	/**
	 * Create a new range using this range's start position, and using endLineNumber and endColumn as the end position.
	 */
	

	/**
	 * Create a new range using this range's end position, and using startLineNumber and startColumn as the start position.
	 */
	

	/**
	 * Create a new empty range using this range's start position.
	 */
	

	/**
	 * Create a new empty range using this range's start position.
	 */
	

	/**
	 * Create a new empty range using this range's end position.
	 */
	

	/**
	 * Create a new empty range using this range's end position.
	 */
	

	/**
	 * Moves the range by the given amount of lines.
	 */
	

	

	// ---

	public static fromPositions(start: IPosition, end: IPosition = start): Range {
		return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
	}

	/**
	 * Create a `Range` from an `IRange`.
	 */
	
	
	
	

	/**
	 * Test if `obj` is an `IRange`.
	 */
	

	/**
	 * Test if the two ranges are touching in any way.
	 */
	

	/**
	 * Test if the two ranges are intersecting. If the ranges are touching it returns true.
	 */
	

	/**
	 * Test if the two ranges are intersecting, but not touching at all.
	 */
	

	/**
	 * A function that compares ranges, useful for sorting ranges
	 * It will first compare ranges on the startPosition and then on the endPosition
	 */
	

	/**
	 * A function that compares ranges, useful for sorting ranges
	 * It will first compare ranges on the endPosition and then on the startPosition
	 */
	

	/**
	 * Test if the range spans multiple lines.
	 */
	

	
}
