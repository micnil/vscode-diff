

/**
 * Groups the collection into a dictionary based on the provided
 * group function.
 */
export function groupBy<K extends string | number | symbol, V>(data: readonly V[], groupFn: (element: V) => K): Partial<Record<K, V[]>> {
	const result: Partial<Record<K, V[]>> = Object.create(null);
	for (const element of data) {
		const key = groupFn(element);
		let target = result[key];
		if (!target) {
			target = result[key] = [];
		}
		target.push(element);
	}
	return result;
}

export function diffSets<T>(before: ReadonlySet<T>, after: ReadonlySet<T>): { removed: T[]; added: T[] } {
	const removed: T[] = [];
	const added: T[] = [];
	for (const element of before) {
		if (!after.has(element)) {
			removed.push(element);
		}
	}
	for (const element of after) {
		if (!before.has(element)) {
			added.push(element);
		}
	}
	return { removed, added };
}
