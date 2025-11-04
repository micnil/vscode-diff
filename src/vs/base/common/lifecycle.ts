/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { compareBy, numberComparator } from './arrays.js';
import { groupBy } from './collections.js';
import { BugIndicatingError, onUnexpectedError } from './errors.js';
import { Iterable } from './iterator.js';
import { SetMap } from './map.js';

// #region Disposable Tracking

/**
 * Enables logging of potentially leaked disposables.
 *
 * A disposable is considered leaked if it is not disposed or not registered as the child of
 * another disposable. This tracking is very simple an only works for classes that either
 * extend Disposable or use a DisposableStore. This means there are a lot of false positives.
 */
const TRACK_DISPOSABLES = false;
let disposableTracker: IDisposableTracker | null = null;

export interface IDisposableTracker {
	/**
	 * Is called on construction of a disposable.
	*/
	trackDisposable(disposable: IDisposable): void;

	/**
	 * Is called when a disposable is registered as child of another disposable (e.g. {@link DisposableStore}).
	 * If parent is `null`, the disposable is removed from its former parent.
	*/
	setParent(child: IDisposable, parent: IDisposable | null): void;

	/**
	 * Is called after a disposable is disposed.
	*/
	markAsDisposed(disposable: IDisposable): void;

	/**
	 * Indicates that the given object is a singleton which does not need to be disposed.
	*/
	markAsSingleton(disposable: IDisposable): void;
}

export interface DisposableInfo {
	value: IDisposable;
	source: string | null;
	parent: IDisposable | null;
	isSingleton: boolean;
	idx: number;
}

export class DisposableTracker implements IDisposableTracker {
	private static idx = 0;

	private readonly livingDisposables = new Map<IDisposable, DisposableInfo>();

	private getDisposableData(d: IDisposable): DisposableInfo {
		let val = this.livingDisposables.get(d);
		if (!val) {
			val = { parent: null, source: null, isSingleton: false, value: d, idx: DisposableTracker.idx++ };
			this.livingDisposables.set(d, val);
		}
		return val;
	}

	trackDisposable(d: IDisposable): void {
		const data = this.getDisposableData(d);
		if (!data.source) {
			data.source =
				new Error().stack!;
		}
	}

	setParent(child: IDisposable, parent: IDisposable | null): void {
		const data = this.getDisposableData(child);
		data.parent = parent;
	}

	markAsDisposed(x: IDisposable): void {
		this.livingDisposables.delete(x);
	}

	markAsSingleton(disposable: IDisposable): void {
		this.getDisposableData(disposable).isSingleton = true;
	}

	private getRootParent(data: DisposableInfo, cache: Map<DisposableInfo, DisposableInfo>): DisposableInfo {
		const cacheValue = cache.get(data);
		if (cacheValue) {
			return cacheValue;
		}

		const result = data.parent ? this.getRootParent(this.getDisposableData(data.parent), cache) : data;
		cache.set(data, result);
		return result;
	}

	getTrackedDisposables(): IDisposable[] {
		const rootParentCache = new Map<DisposableInfo, DisposableInfo>();

		const leaking = [...this.livingDisposables.entries()]
			.filter(([, v]) => v.source !== null && !this.getRootParent(v, rootParentCache).isSingleton)
			.flatMap(([k]) => k);

		return leaking;
	}

	computeLeakingDisposables(maxReported = 10, preComputedLeaks?: DisposableInfo[]): { leaks: DisposableInfo[]; details: string } | undefined {
		let uncoveredLeakingObjs: DisposableInfo[] | undefined;
		if (preComputedLeaks) {
			uncoveredLeakingObjs = preComputedLeaks;
		} else {
			const rootParentCache = new Map<DisposableInfo, DisposableInfo>();

			const leakingObjects = [...this.livingDisposables.values()]
				.filter((info) => info.source !== null && !this.getRootParent(info, rootParentCache).isSingleton);

			if (leakingObjects.length === 0) {
				return;
			}
			const leakingObjsSet = new Set(leakingObjects.map(o => o.value));

			// Remove all objects that are a child of other leaking objects. Assumes there are no cycles.
			uncoveredLeakingObjs = leakingObjects.filter(l => {
				return !(l.parent && leakingObjsSet.has(l.parent));
			});

			if (uncoveredLeakingObjs.length === 0) {
				throw new Error('There are cyclic diposable chains!');
			}
		}

		if (!uncoveredLeakingObjs) {
			return undefined;
		}

		function getStackTracePath(leaking: DisposableInfo): string[] {
			function removePrefix(array: string[], linesToRemove: (string | RegExp)[]) {
				while (array.length > 0 && linesToRemove.some(regexp => typeof regexp === 'string' ? regexp === array[0] : array[0].match(regexp))) {
					array.shift();
				}
			}

			const lines = leaking.source!.split('\n').map(p => p.trim().replace('at ', '')).filter(l => l !== '');
			removePrefix(lines, ['Error', /^trackDisposable \(.*\)$/, /^DisposableTracker.trackDisposable \(.*\)$/]);
			return lines.reverse();
		}

		const stackTraceStarts = new SetMap<string, DisposableInfo>();
		for (const leaking of uncoveredLeakingObjs) {
			const stackTracePath = getStackTracePath(leaking);
			for (let i = 0; i <= stackTracePath.length; i++) {
				stackTraceStarts.add(stackTracePath.slice(0, i).join('\n'), leaking);
			}
		}

		// Put earlier leaks first
		uncoveredLeakingObjs.sort(compareBy(l => l.idx, numberComparator));

		let message = '';

		let i = 0;
		for (const leaking of uncoveredLeakingObjs.slice(0, maxReported)) {
			i++;
			const stackTracePath = getStackTracePath(leaking);
			const stackTraceFormattedLines = [];

			for (let i = 0; i < stackTracePath.length; i++) {
				let line = stackTracePath[i];
				const starts = stackTraceStarts.get(stackTracePath.slice(0, i + 1).join('\n'));
				line = `(shared with ${starts.size}/${uncoveredLeakingObjs.length} leaks) at ${line}`;

				const prevStarts = stackTraceStarts.get(stackTracePath.slice(0, i).join('\n'));
				const continuations = groupBy([...prevStarts].map(d => getStackTracePath(d)[i]), v => v);
				delete continuations[stackTracePath[i]];
				for (const [cont, set] of Object.entries(continuations)) {
					if (set) {
						stackTraceFormattedLines.unshift(`    - stacktraces of ${set.length} other leaks continue with ${cont}`);
					}
				}

				stackTraceFormattedLines.unshift(line);
			}

			message += `\n\n\n==================== Leaking disposable ${i}/${uncoveredLeakingObjs.length}: ${leaking.value.constructor.name} ====================\n${stackTraceFormattedLines.join('\n')}\n============================================================\n\n`;
		}

		if (uncoveredLeakingObjs.length > maxReported) {
			message += `\n\n\n... and ${uncoveredLeakingObjs.length - maxReported} more leaking disposables\n\n`;
		}

		return { leaks: uncoveredLeakingObjs, details: message };
	}
}

export function setDisposableTracker(tracker: IDisposableTracker | null): void {
	disposableTracker = tracker;
}

if (TRACK_DISPOSABLES) {
	const __is_disposable_tracked__ = '__is_disposable_tracked__';
	setDisposableTracker(new class implements IDisposableTracker {
		trackDisposable(x: IDisposable): void {
			const stack = new Error('Potentially leaked disposable').stack!;
			setTimeout(() => {
				if (!(x as any)[__is_disposable_tracked__]) {
					console.log(stack);
				}
			}, 3000);
		}

		setParent(child: IDisposable, parent: IDisposable | null): void {
			if (child && child !== Disposable.None) {
				try {
					(child as any)[__is_disposable_tracked__] = true;
				} catch {
					// noop
				}
			}
		}

		markAsDisposed(disposable: IDisposable): void {
			if (disposable && disposable !== Disposable.None) {
				try {
					(disposable as any)[__is_disposable_tracked__] = true;
				} catch {
					// noop
				}
			}
		}
		markAsSingleton(disposable: IDisposable): void { }
	});
}

export function trackDisposable<T extends IDisposable>(x: T): T {
	disposableTracker?.trackDisposable(x);
	return x;
}

export function markAsDisposed(disposable: IDisposable): void {
	disposableTracker?.markAsDisposed(disposable);
}

function setParentOfDisposable(child: IDisposable, parent: IDisposable | null): void {
	disposableTracker?.setParent(child, parent);
}

function setParentOfDisposables(children: IDisposable[], parent: IDisposable | null): void {
	if (!disposableTracker) {
		return;
	}
	for (const child of children) {
		disposableTracker.setParent(child, parent);
	}
}

// #endregion

/**
 * An object that performs a cleanup operation when `.dispose()` is called.
 *
 * Some examples of how disposables are used:
 *
 * - An event listener that removes itself when `.dispose()` is called.
 * - A resource such as a file system watcher that cleans up the resource when `.dispose()` is called.
 * - The return value from registering a provider. When `.dispose()` is called, the provider is unregistered.
 */
export interface IDisposable {
	dispose(): void;
}

/**
 * Check if `thing` is {@link IDisposable disposable}.
 */
export function isDisposable<E>(thing: E): thing is E & IDisposable {
	return typeof thing === 'object' && thing !== null && typeof (<IDisposable><any>thing).dispose === 'function' && (<IDisposable><any>thing).dispose.length === 0;
}

/**
 * Disposes of the value(s) passed in.
 */
export function dispose<T extends IDisposable>(disposable: T): T;
export function dispose<T extends IDisposable>(disposable: T | undefined): T | undefined;
export function dispose<T extends IDisposable, A extends Iterable<T> = Iterable<T>>(disposables: A): A;
export function dispose<T extends IDisposable>(disposables: Array<T>): Array<T>;
export function dispose<T extends IDisposable>(disposables: ReadonlyArray<T>): ReadonlyArray<T>;
export function dispose<T extends IDisposable>(arg: T | Iterable<T> | undefined): any {
	if (Iterable.is(arg)) {
		const errors: any[] = [];

		for (const d of arg) {
			if (d) {
				try {
					d.dispose();
				} catch (e) {
					errors.push(e);
				}
			}
		}

		if (errors.length === 1) {
			throw errors[0];
		} else if (errors.length > 1) {
			throw new AggregateError(errors, 'Encountered errors while disposing of store');
		}

		return Array.isArray(arg) ? [] : arg;
	} else if (arg) {
		arg.dispose();
		return arg;
	}
}

/**
 * Combine multiple disposable values into a single {@link IDisposable}.
 */
export function combinedDisposable(...disposables: IDisposable[]): IDisposable {
	const parent = toDisposable(() => dispose(disposables));
	setParentOfDisposables(disposables, parent);
	return parent;
}

class FunctionDisposable implements IDisposable {
	private _isDisposed: boolean;
	private readonly _fn: () => void;

	constructor(fn: () => void) {
		this._isDisposed = false;
		this._fn = fn;
		trackDisposable(this);
	}

	dispose() {
		if (this._isDisposed) {
			return;
		}
		if (!this._fn) {
			throw new Error(`Unbound disposable context: Need to use an arrow function to preserve the value of this`);
		}
		this._isDisposed = true;
		markAsDisposed(this);
		this._fn();
	}
}

/**
 * Turn a function that implements dispose into an {@link IDisposable}.
 *
 * @param fn Clean up function, guaranteed to be called only **once**.
 */
export function toDisposable(fn: () => void): IDisposable {
	return new FunctionDisposable(fn);
}

/**
 * Manages a collection of disposable values.
 *
 * This is the preferred way to manage multiple disposables. A `DisposableStore` is safer to work with than an
 * `IDisposable[]` as it considers edge cases, such as registering the same value multiple times or adding an item to a
 * store that has already been disposed of.
 */
export class DisposableStore implements IDisposable {

	static DISABLE_DISPOSED_WARNING = false;

	private readonly _toDispose = new Set<IDisposable>();
	private _isDisposed = false;

	constructor() {
		trackDisposable(this);
	}

	/**
	 * Dispose of all registered disposables and mark this object as disposed.
	 *
	 * Any future disposables added to this object will be disposed of on `add`.
	 */
	public dispose(): void {
		if (this._isDisposed) {
			return;
		}

		markAsDisposed(this);
		this._isDisposed = true;
		this.clear();
	}

	/**
	 * @return `true` if this object has been disposed of.
	 */
	public get isDisposed(): boolean {
		return this._isDisposed;
	}

	/**
	 * Dispose of all registered disposables but do not mark this object as disposed.
	 */
	public clear(): void {
		if (this._toDispose.size === 0) {
			return;
		}

		try {
			dispose(this._toDispose);
		} finally {
			this._toDispose.clear();
		}
	}

	/**
	 * Add a new {@link IDisposable disposable} to the collection.
	 */
	public add<T extends IDisposable>(o: T): T {
		if (!o || o === Disposable.None) {
			return o;
		}
		if ((o as unknown as DisposableStore) === this) {
			throw new Error('Cannot register a disposable on itself!');
		}

		setParentOfDisposable(o, this);
		if (this._isDisposed) {
			if (!DisposableStore.DISABLE_DISPOSED_WARNING) {
				console.warn(new Error('Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!').stack);
			}
		} else {
			this._toDispose.add(o);
		}

		return o;
	}

	/**
	 * Deletes a disposable from store and disposes of it. This will not throw or warn and proceed to dispose the
	 * disposable even when the disposable is not part in the store.
	 */
	public delete<T extends IDisposable>(o: T): void {
		if (!o) {
			return;
		}
		if ((o as unknown as DisposableStore) === this) {
			throw new Error('Cannot dispose a disposable on itself!');
		}
		this._toDispose.delete(o);
		o.dispose();
	}

	/**
	 * Deletes the value from the store, but does not dispose it.
	 */
	public deleteAndLeak<T extends IDisposable>(o: T): void {
		if (!o) {
			return;
		}
		if (this._toDispose.has(o)) {
			this._toDispose.delete(o);
			setParentOfDisposable(o, null);
		}
	}

	public assertNotDisposed(): void {
		if (this._isDisposed) {
			onUnexpectedError(new BugIndicatingError('Object disposed'));
		}
	}
}

/**
 * Abstract base class for a {@link IDisposable disposable} object.
 *
 * Subclasses can {@linkcode _register} disposables that will be automatically cleaned up when this object is disposed of.
 */
export abstract class Disposable implements IDisposable {

	/**
	 * A disposable that does nothing when it is disposed of.
	 *
	 * TODO: This should not be a static property.
	 */
	static readonly None = Object.freeze<IDisposable>({ dispose() { } });

	protected readonly _store = new DisposableStore();

	constructor() {
		trackDisposable(this);
		setParentOfDisposable(this._store, this);
	}

	public dispose(): void {
		markAsDisposed(this);

		this._store.dispose();
	}

	/**
	 * Adds `o` to the collection of disposables managed by this object.
	 */
	protected _register<T extends IDisposable>(o: T): T {
		if ((o as unknown as Disposable) === this) {
			throw new Error('Cannot register a disposable on itself!');
		}
		return this._store.add(o);
	}
}

export interface IReference<T> extends IDisposable {
	readonly object: T;
}
