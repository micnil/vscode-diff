/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { findFirstIdxMonotonousOrArrLen } from './arraysFind.js';
import { ISplice } from './sequence.js';

export function equals<T>(one: ReadonlyArray<T> | undefined, other: ReadonlyArray<T> | undefined, itemEquals: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
	if (one === other) {
		return true;
	}

	if (!one || !other) {
		return false;
	}

	if (one.length !== other.length) {
		return false;
	}

	for (let i = 0, len = one.length; i < len; i++) {
		if (!itemEquals(one[i], other[i])) {
			return false;
		}
	}

	return true;
}

/**
 * Performs a binary search algorithm over a sorted collection. Useful for cases
 * when we need to perform a binary search over something that isn't actually an
 * array, and converting data to an array would defeat the use of binary search
 * in the first place.
 *
 * @param length The collection length.
 * @param compareToKey A function that takes an index of an element in the
 *   collection and returns zero if the value at this index is equal to the
 *   search key, a negative number if the value precedes the search key in the
 *   sorting order, or a positive number if the search key precedes the value.
 * @return A non-negative index of an element, if found. If not found, the
 *   result is -(n+1) (or ~n, using bitwise notation), where n is the index
 *   where the key should be inserted to maintain the sorting order.
 */
export function binarySearch2(length: number, compareToKey: (index: number) => number): number {
	let low = 0,
		high = length - 1;

	while (low <= high) {
		const mid = ((low + high) / 2) | 0;
		const comp = compareToKey(mid);
		if (comp < 0) {
			low = mid + 1;
		} else if (comp > 0) {
			high = mid - 1;
		} else {
			return mid;
		}
	}
	return -(low + 1);
}

type Compare<T> = (a: T, b: T) => number;


export function quickSelect<T>(nth: number, data: T[], compare: Compare<T>): T {

	nth = nth | 0;

	if (nth >= data.length) {
		throw new TypeError('invalid index');
	}

	const pivotValue = data[Math.floor(data.length * Math.random())];
	const lower: T[] = [];
	const higher: T[] = [];
	const pivots: T[] = [];

	for (const value of data) {
		const val = compare(value, pivotValue);
		if (val < 0) {
			lower.push(value);
		} else if (val > 0) {
			higher.push(value);
		} else {
			pivots.push(value);
		}
	}

	if (nth < lower.length) {
		return quickSelect(nth, lower, compare);
	} else if (nth < lower.length + pivots.length) {
		return pivots[0];
	} else {
		return quickSelect(nth - (lower.length + pivots.length), higher, compare);
	}
}

/**
 * Splits the given items into a list of (non-empty) groups.
 * `shouldBeGrouped` is used to decide if two consecutive items should be in the same group.
 * The order of the items is preserved.
 */
export function* groupAdjacentBy<T>(items: Iterable<T>, shouldBeGrouped: (item1: T, item2: T) => boolean): Iterable<T[]> {
	let currentGroup: T[] | undefined;
	let last: T | undefined;
	for (const item of items) {
		if (last !== undefined && shouldBeGrouped(last, item)) {
			currentGroup!.push(item);
		} else {
			if (currentGroup) {
				yield currentGroup;
			}
			currentGroup = [item];
		}
		last = item;
	}
	if (currentGroup) {
		yield currentGroup;
	}
}

export function forEachAdjacent<T>(arr: T[], f: (item1: T | undefined, item2: T | undefined) => void): void {
	for (let i = 0; i <= arr.length; i++) {
		f(i === 0 ? undefined : arr[i - 1], i === arr.length ? undefined : arr[i]);
	}
}

export function forEachWithNeighbors<T>(arr: T[], f: (before: T | undefined, element: T, after: T | undefined) => void): void {
	for (let i = 0; i < arr.length; i++) {
		f(i === 0 ? undefined : arr[i - 1], arr[i], i + 1 === arr.length ? undefined : arr[i + 1]);
	}
}

interface IMutableSplice<T> extends ISplice<T> {
	readonly toInsert: T[];
	deleteCount: number;
}

/**
 * Diffs two *sorted* arrays and computes the splices which apply the diff.
 */
export function sortedDiff<T>(before: ReadonlyArray<T>, after: ReadonlyArray<T>, compare: (a: T, b: T) => number): ISplice<T>[] {
	const result: IMutableSplice<T>[] = [];

	function pushSplice(start: number, deleteCount: number, toInsert: T[]): void {
		if (deleteCount === 0 && toInsert.length === 0) {
			return;
		}

		const latest = result[result.length - 1];

		if (latest && latest.start + latest.deleteCount === start) {
			latest.deleteCount += deleteCount;
			latest.toInsert.push(...toInsert);
		} else {
			result.push({ start, deleteCount, toInsert });
		}
	}

	let beforeIdx = 0;
	let afterIdx = 0;

	while (true) {
		if (beforeIdx === before.length) {
			pushSplice(beforeIdx, 0, after.slice(afterIdx));
			break;
		}
		if (afterIdx === after.length) {
			pushSplice(beforeIdx, before.length - beforeIdx, []);
			break;
		}

		const beforeElement = before[beforeIdx];
		const afterElement = after[afterIdx];
		const n = compare(beforeElement, afterElement);
		if (n === 0) {
			// equal
			beforeIdx += 1;
			afterIdx += 1;
		} else if (n < 0) {
			// beforeElement is smaller -> before element removed
			pushSplice(beforeIdx, 1, []);
			beforeIdx += 1;
		} else if (n > 0) {
			// beforeElement is greater -> after element added
			pushSplice(beforeIdx, 0, [afterElement]);
			afterIdx += 1;
		}
	}

	return result;
}

function topStep<T>(array: ReadonlyArray<T>, compare: (a: T, b: T) => number, result: T[], i: number, m: number): void {
	for (const n = result.length; i < m; i++) {
		const element = array[i];
		if (compare(element, result[n - 1]) < 0) {
			result.pop();
			const j = findFirstIdxMonotonousOrArrLen(result, e => compare(element, e) < 0);
			result.splice(j, 0, element);
		}
	}
}

/**
 * @returns True if the provided object is an array and has at least one element.
 */
export function isNonEmptyArray<T>(obj: T[] | undefined | null): obj is T[];
export function isNonEmptyArray<T>(obj: readonly T[] | undefined | null): obj is readonly T[];
export function isNonEmptyArray<T>(obj: T[] | readonly T[] | undefined | null): obj is T[] | readonly T[] {
	return Array.isArray(obj) && obj.length > 0;
}

export function range(to: number): number[];
export function range(from: number, to: number): number[];
export function range(arg: number, to?: number): number[] {
	let from = typeof to === 'number' ? arg : 0;

	if (typeof to === 'number') {
		from = arg;
	} else {
		from = 0;
		to = arg;
	}

	const result: number[] = [];

	if (from <= to) {
		for (let i = from; i < to; i++) {
			result.push(i);
		}
	} else {
		for (let i = from; i > to; i--) {
			result.push(i);
		}
	}

	return result;
}

export function index<T>(array: ReadonlyArray<T>, indexer: (t: T) => string): { [key: string]: T };
export function index<T, R>(array: ReadonlyArray<T>, indexer: (t: T) => string, mapper: (t: T) => R): { [key: string]: R };
export function index<T, R>(array: ReadonlyArray<T>, indexer: (t: T) => string, mapper?: (t: T) => R): { [key: string]: R } {
	return array.reduce((r, t) => {
		r[indexer(t)] = mapper ? mapper(t) : t;
		return r;
	}, Object.create(null));
}

/**
 * Removes an element from an array if it can be found.
 *
 * @deprecated In almost all cases, use a `Set<T>` instead.
 */
export function remove<T>(array: T[], element: T): T | undefined {
	const index = array.indexOf(element);
	if (index > -1) {
		array.splice(index, 1);

		return element;
	}

	return undefined;
}

export function pushMany<T>(arr: T[], items: ReadonlyArray<T>): void {
	for (const item of items) {
		arr.push(item);
	}
}

export function asArray<T>(x: T | T[]): T[];
export function asArray<T>(x: T | readonly T[]): readonly T[];
export function asArray<T>(x: T | T[]): T[] {
	return Array.isArray(x) ? x : [x];
}

/**
 * Insert the new items in the array.
 * @param array The original array.
 * @param start The zero-based location in the array from which to start inserting elements.
 * @param newItems The items to be inserted
 */
export function insertInto<T>(array: T[], start: number, newItems: T[]): void {
	const startIdx = getActualStartIndex(array, start);
	const originalLength = array.length;
	const newItemsLength = newItems.length;
	array.length = originalLength + newItemsLength;
	// Move the items after the start index, start from the end so that we don't overwrite any value.
	for (let i = originalLength - 1; i >= startIdx; i--) {
		array[i + newItemsLength] = array[i];
	}

	for (let i = 0; i < newItemsLength; i++) {
		array[i + startIdx] = newItems[i];
	}
}

/**
 * Determine the actual start index (same logic as the native splice() or slice())
 * If greater than the length of the array, start will be set to the length of the array. In this case, no element will be deleted but the method will behave as an adding function, adding as many element as item[n*] provided.
 * If negative, it will begin that many elements from the end of the array. (In this case, the origin -1, meaning -n is the index of the nth last element, and is therefore equivalent to the index of array.length - n.) If array.length + start is less than 0, it will begin from index 0.
 * @param array The target array.
 * @param start The operation index.
 */
function getActualStartIndex<T>(array: T[], start: number): number {
	return start < 0 ? Math.max(start + array.length, 0) : Math.min(start, array.length);
}



/**
 * When comparing two values,
 * a negative number indicates that the first value is less than the second,
 * a positive number indicates that the first value is greater than the second,
 * and zero indicates that neither is the case.
*/
export type CompareResult = number;

export namespace CompareResult {
	export function isLessThan(result: CompareResult): boolean {
		return result < 0;
	}

	export function isLessThanOrEqual(result: CompareResult): boolean {
		return result <= 0;
	}

	export function isGreaterThan(result: CompareResult): boolean {
		return result > 0;
	}

	export function isNeitherLessOrGreaterThan(result: CompareResult): boolean {
		return result === 0;
	}

	export const greaterThan = 1;
	export const lessThan = -1;
	export const neitherLessOrGreaterThan = 0;
}

/**
 * A comparator `c` defines a total order `<=` on `T` as following:
 * `c(a, b) <= 0` iff `a` <= `b`.
 * We also have `c(a, b) == 0` iff `c(b, a) == 0`.
*/
export type Comparator<T> = (a: T, b: T) => CompareResult;

export function compareBy<TItem, TCompareBy>(selector: (item: TItem) => TCompareBy, comparator: Comparator<TCompareBy>): Comparator<TItem> {
	return (a, b) => comparator(selector(a), selector(b));
}

/**
 * The natural order on numbers.
*/
export const numberComparator: Comparator<number> = (a, b) => a - b;

export function reverseOrder<TItem>(comparator: Comparator<TItem>): Comparator<TItem> {
	return (a, b) => -comparator(a, b);
}

/**
 * This class is faster than an iterator and array for lazy computed data.
*/
export class CallbackIterable<T> {
	public static readonly empty = new CallbackIterable<never>(_callback => { });

	constructor(
		/**
		 * Calls the callback for every item.
		 * Stops when the callback returns false.
		*/
		public readonly iterate: (callback: (item: T) => boolean) => void
	) {
	}

	forEach(handler: (item: T) => void) {
		this.iterate(item => { handler(item); return true; });
	}

	toArray(): T[] {
		const result: T[] = [];
		this.iterate(item => { result.push(item); return true; });
		return result;
	}

	filter(predicate: (item: T) => boolean): CallbackIterable<T> {
		return new CallbackIterable(cb => this.iterate(item => predicate(item) ? cb(item) : true));
	}

	map<TResult>(mapFn: (item: T) => TResult): CallbackIterable<TResult> {
		return new CallbackIterable<TResult>(cb => this.iterate(item => cb(mapFn(item))));
	}

	some(predicate: (item: T) => boolean): boolean {
		let result = false;
		this.iterate(item => { result = predicate(item); return !result; });
		return result;
	}

	findFirst(predicate: (item: T) => boolean): T | undefined {
		let result: T | undefined;
		this.iterate(item => {
			if (predicate(item)) {
				result = item;
				return false;
			}
			return true;
		});
		return result;
	}

	findLast(predicate: (item: T) => boolean): T | undefined {
		let result: T | undefined;
		this.iterate(item => {
			if (predicate(item)) {
				result = item;
			}
			return true;
		});
		return result;
	}

	findLastMaxBy(comparator: Comparator<T>): T | undefined {
		let result: T | undefined;
		let first = true;
		this.iterate(item => {
			if (first || CompareResult.isGreaterThan(comparator(item, result!))) {
				first = false;
				result = item;
			}
			return true;
		});
		return result;
	}
}

/**
 * Represents a re-arrangement of items in an array.
 */
export class Permutation {
	constructor(private readonly _indexMap: readonly number[]) { }

	/**
	 * Returns a permutation that sorts the given array according to the given compare function.
	 */
	public static createSortPermutation<T>(arr: readonly T[], compareFn: (a: T, b: T) => number): Permutation {
		const sortIndices = Array.from(arr.keys()).sort((index1, index2) => compareFn(arr[index1], arr[index2]));
		return new Permutation(sortIndices);
	}

	/**
	 * Returns a new array with the elements of the given array re-arranged according to this permutation.
	 */
	apply<T>(arr: readonly T[]): T[] {
		return arr.map((_, index) => arr[this._indexMap[index]]);
	}

	/**
	 * Returns a new permutation that undoes the re-arrangement of this permutation.
	*/
	inverse(): Permutation {
		const inverseIndexMap = this._indexMap.slice();
		for (let i = 0; i < this._indexMap.length; i++) {
			inverseIndexMap[this._indexMap[i]] = i;
		}
		return new Permutation(inverseIndexMap);
	}
}

export function sumBy<T>(array: readonly T[], selector: (value: T) => number): number {
	return array.reduce((acc, value) => acc + selector(value), 0);
}
