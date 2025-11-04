/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assert } from './assert.js';

/**
 * @returns whether the provided parameter is a JavaScript String or not.
 */
export function isString(str: unknown): str is string {
	return (typeof str === 'string');
}

/**
 * @returns whether the provided parameter is an Iterable, casting to the given generic
 */
export function isIterable<T>(obj: unknown): obj is Iterable<T> {
	return !!obj && typeof (obj as any)[Symbol.iterator] === 'function';
}

/**
 * @returns whether the provided parameter is undefined.
 */
export function isUndefined(obj: unknown): obj is undefined {
	return (typeof obj === 'undefined');
}

/**
 * @returns whether the provided parameter is undefined or null.
 */
export function isUndefinedOrNull(obj: unknown): obj is undefined | null {
	return (isUndefined(obj) || obj === null);
}

/**
 * Asserts that the argument passed in is neither undefined nor null.
 *
 * @see {@link assertDefined} for a similar utility that leverages TS assertion functions to narrow down the type of `arg` to be non-nullable.
 */
export function assertReturnsDefined<T>(arg: T | null | undefined): NonNullable<T> {
	assert(
		arg !== null && arg !== undefined,
		'Argument is `undefined` or `null`.',
	);

	return arg;
}

/**
 * Asserts that a provided `value` is `defined` - not `null` or `undefined`,
 * throwing an error with the provided error or error message, while also
 * narrowing down the type of the `value` to be `NonNullable` using TS
 * assertion functions.
 *
 * @throws if the provided `value` is `null` or `undefined`.
 *
 * ## Examples
 *
 * ```typescript
 * // an assert with an error message
 * assertDefined('some value', 'String constant is not defined o_O.');
 *
 * // `throws!` the provided error
 * assertDefined(null, new Error('Should throw this error.'));
 *
 * // narrows down the type of `someValue` to be non-nullable
 * const someValue: string | undefined | null = blackbox();
 * assertDefined(someValue, 'Some value must be defined.');
 * console.log(someValue.length); // now type of `someValue` is `string`
 * ```
 *
 * @see {@link assertReturnsDefined} for a similar utility but without assertion.
 * @see {@link https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions typescript-3-7.html#assertion-functions}
 */
export function assertDefined<T>(value: T, error: string | NonNullable<Error>): asserts value is NonNullable<T> {
	if (value === null || value === undefined) {
		const errorToThrow = typeof error === 'string' ? new Error(error) : error;

		throw errorToThrow;
	}
}

/**
 * Asserts that each argument passed in is neither undefined nor null.
 */
export function assertReturnsAllDefined<T1, T2>(t1: T1 | null | undefined, t2: T2 | null | undefined): [T1, T2];
export function assertReturnsAllDefined<T1, T2, T3>(t1: T1 | null | undefined, t2: T2 | null | undefined, t3: T3 | null | undefined): [T1, T2, T3];
export function assertReturnsAllDefined<T1, T2, T3, T4>(t1: T1 | null | undefined, t2: T2 | null | undefined, t3: T3 | null | undefined, t4: T4 | null | undefined): [T1, T2, T3, T4];
export function assertReturnsAllDefined(...args: (unknown | null | undefined)[]): unknown[] {
	const result = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (isUndefinedOrNull(arg)) {
			throw new Error(`Assertion Failed: argument at index ${i} is undefined or null`);
		}

		result.push(arg);
	}

	return result;
}

/**
 * @returns whether the provided parameter is a JavaScript Function or not.
 */
export function isFunction(obj: unknown): obj is Function {
	return (typeof obj === 'function');
}

export type TypeConstraint = string | Function;

/**
 * A type that adds readonly to all properties of T, recursively.
 */
export type DeepImmutable<T> = T extends (infer U)[]
	? ReadonlyArray<DeepImmutable<U>>
	: T extends ReadonlyArray<infer U>
	? ReadonlyArray<DeepImmutable<U>>
	: T extends Map<infer K, infer V>
	? ReadonlyMap<K, DeepImmutable<V>>
	: T extends Set<infer U>
	? ReadonlySet<DeepImmutable<U>>
	: T extends object
	? {
		readonly [K in keyof T]: DeepImmutable<T[K]>;
	}
	: T;


/**
 * A type that recursively makes all properties of `T` required
 */
export type DeepRequiredNonNullable<T> = {
	[P in keyof T]-?: T[P] extends object ? DeepRequiredNonNullable<T[P]> : Required<NonNullable<T[P]>>;
};


/**
 * Represents a type that is a partial version of a given type `T`, where all properties are optional and can be deeply nested.
 */
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : Partial<T[P]>;
};
