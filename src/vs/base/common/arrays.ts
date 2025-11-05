/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


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

export function pushMany<T>(arr: T[], items: ReadonlyArray<T>): void {
	for (const item of items) {
		arr.push(item);
	}
}


/**
 * When comparing two values,
 * a negative number indicates that the first value is less than the second,
 * a positive number indicates that the first value is greater than the second,
 * and zero indicates that neither is the case.
*/
type CompareResult = number;

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

}

export function sumBy<T>(array: readonly T[], selector: (value: T) => number): number {
	return array.reduce((acc, value) => acc + selector(value), 0);
}
